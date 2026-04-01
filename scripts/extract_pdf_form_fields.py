#!/usr/bin/env python3
"""Extract official PDF widget fields into frontend-friendly JSON assets."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from pypdf import PdfReader

IGNORED_LINE_PATTERNS = (
    re.compile(r"^Form 1040\b", re.IGNORECASE),
    re.compile(r"^Form 1040 \(\d{4}\) Page \d+$", re.IGNORECASE),
    re.compile(r"^SCHEDULE SE \(Form 1040\)$", re.IGNORECASE),
    re.compile(r"^Schedule SE \(Form 1040\) \d{4} Page \d+$", re.IGNORECASE),
    re.compile(r"^OMB No\.", re.IGNORECASE),
    re.compile(r"^IRS Use Only", re.IGNORECASE),
    re.compile(r"^For the year Jan\.", re.IGNORECASE),
    re.compile(r"^Department of the Treasury", re.IGNORECASE),
    re.compile(r"^For Paperwork Reduction Act Notice", re.IGNORECASE),
    re.compile(r"^Attach to Form ", re.IGNORECASE),
    re.compile(r"^Attachment Sequence No\.", re.IGNORECASE),
    re.compile(r"^Self-Employment Tax$", re.IGNORECASE),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract fillable PDF widget rectangles and nearby label context.",
    )
    parser.add_argument("--input-pdf", required=True, help="Path to the official fillable PDF.")
    parser.add_argument(
        "--layout-json",
        required=True,
        help="Path to the flattened parser layout JSON used for form chrome redraw.",
    )
    parser.add_argument("--output", required=True, help="Path for the extracted field asset JSON.")
    parser.add_argument(
        "--exclude-tiny-threshold",
        type=float,
        default=3.0,
        help="Exclude widget rectangles narrower or shorter than this many PDF points.",
    )
    return parser.parse_args()


def normalize_text(value: str) -> str:
    collapsed = re.sub(r"\s+", " ", value).strip()
    return collapsed[:220]


def build_text_lines(page: dict[str, Any]) -> list[dict[str, Any]]:
    texts = sorted(
        (element for element in page["elements"] if element["type"] == "text"),
        key=lambda element: (round(element["top"], 1), element["left"]),
    )
    lines: list[dict[str, Any]] = []

    for text in texts:
        mid = text["top"] + text["height"] / 2

        for line in lines:
            if abs(line["mid"] - mid) <= 3.2:
                line["parts"].append(text)
                line["mid"] = (line["mid"] * line["count"] + mid) / (line["count"] + 1)
                line["count"] += 1
                break
        else:
            lines.append({"count": 1, "mid": mid, "parts": [text]})

    normalized_lines: list[dict[str, Any]] = []

    for line in lines:
        parts = sorted(line["parts"], key=lambda part: part["left"])
        text = normalize_text(" ".join(part["text"] for part in parts if part["text"].strip()))

        if not text:
            continue

        normalized_lines.append(
            {
                "bottom": max(part["top"] + part["height"] for part in parts),
                "left": min(part["left"] for part in parts),
                "right": max(part["left"] + part["width"] for part in parts),
                "text": text,
                "top": min(part["top"] for part in parts),
            }
        )

    return normalized_lines


def choose_context_lines(
    *,
    field_bottom: float,
    field_left: float,
    field_right: float,
    field_top: float,
    lines: list[dict[str, Any]],
) -> list[str]:
    candidates: list[tuple[float, str]] = []
    field_mid = (field_top + field_bottom) / 2

    for line in lines:
        if any(pattern.search(line["text"]) for pattern in IGNORED_LINE_PATTERNS):
            continue

        line_mid = (line["top"] + line["bottom"]) / 2
        vertical_distance = min(
            abs(line["bottom"] - field_top),
            abs(line["top"] - field_bottom),
            abs(line_mid - field_mid),
        )

        if line["bottom"] < field_top - 16 or line["top"] > field_bottom + 20:
            continue

        if line["right"] < field_left - 220 or line["left"] > field_right + 40:
            continue

        score = vertical_distance * 1.7

        if line["right"] <= field_left:
            score += max(0.0, field_left - line["right"]) * 0.06
        elif line["left"] >= field_right:
            score += 20 + (line["left"] - field_right) * 0.08

        line_width = line["right"] - line["left"]
        if line_width > 340:
            score += (line_width - 340) * 0.05

        if line["top"] < 44 and field_top > 44:
            score += 20

        candidates.append((score, line["text"]))

    candidates.sort(key=lambda item: item[0])

    unique_lines: list[str] = []
    seen: set[str] = set()

    for _, text in candidates:
        if text in seen:
            continue

        seen.add(text)
        unique_lines.append(text)

        if len(unique_lines) == 3:
            break

    return unique_lines


def infer_kind(
    *,
    field_type: str,
    field_label: str,
    left: float,
    page_width: float,
    width: float,
) -> str:
    if field_type == "/Btn":
        return "checkbox"

    label = field_label.lower()

    if any(
        token in label
        for token in (
            "routing",
            "account number",
            "social security number",
            "first name",
            "last name",
            "occupation",
            "phone",
            "email",
            "pin",
            "city",
            "zip",
            "date",
            "beginning",
            "ending",
        )
    ):
        return "text"

    if left >= page_width * 0.65 and width <= 110:
        return "amount"

    if re.match(r"^\d+[a-z]?\b", label):
        return "amount"

    return "text"


def derive_badge(page_number: int, index: int, label: str) -> str:
    line_match = re.search(r"^\s*(\d+[a-z]?|[a-z])\b", label.lower())
    if line_match:
        return line_match.group(1)

    return f"P{page_number}-{index:03d}"


def main() -> None:
    args = parse_args()
    pdf_path = Path(args.input_pdf).resolve()
    layout_path = Path(args.layout_json).resolve()
    output_path = Path(args.output).resolve()

    layout_data = json.loads(layout_path.read_text())
    layout_pages = {page["page_number"]: page for page in layout_data["pages"]}
    text_lines_by_page = {
        page_number: build_text_lines(page) for page_number, page in layout_pages.items()
    }

    reader = PdfReader(str(pdf_path))
    raw_fields: list[dict[str, Any]] = []
    excluded_fields: list[dict[str, Any]] = []

    for page_index, page in enumerate(reader.pages, start=1):
        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)
        annots_ref = page.get("/Annots")
        annots = annots_ref.get_object() if annots_ref else []

        field_index = 0

        for annot_ref in annots:
            annot = annot_ref.get_object()
            field_type = annot.get("/FT")
            rect = annot.get("/Rect")

            if field_type not in ("/Btn", "/Tx") or rect is None:
                continue

            left, bottom, right, top = map(float, rect)
            width = right - left
            height = top - bottom

            if width < args.exclude_tiny_threshold or height < args.exclude_tiny_threshold:
                excluded_fields.append(
                    {
                        "fieldName": annot.get("/T"),
                        "height": height,
                        "page": page_index,
                        "reason": "tiny_widget",
                        "width": width,
                    }
                )
                continue

            field_index += 1
            top_left = page_height - top
            bottom_left = page_height - bottom
            context_lines = choose_context_lines(
                field_bottom=bottom_left,
                field_left=left,
                field_right=right,
                field_top=top_left,
                lines=text_lines_by_page.get(page_index, []),
            )
            field_label = context_lines[0] if context_lines else f"PDF field {annot.get('/T')}"
            kind = infer_kind(
                field_type=field_type,
                field_label=field_label,
                left=left,
                page_width=page_width,
                width=width,
            )

            raw_fields.append(
                {
                    "contextLines": context_lines,
                    "fieldLabelBase": field_label,
                    "fieldName": annot.get("/T"),
                    "height": height,
                    "highlight": {
                        "heightPct": (height / page_height) * 100,
                        "leftPct": (left / page_width) * 100,
                        "topPct": (top_left / page_height) * 100,
                        "widthPct": (width / page_width) * 100,
                    },
                    "id": annot.get("/T"),
                    "index": field_index,
                    "kind": kind,
                    "left": left,
                    "page": page_index,
                    "top": top_left,
                    "widgetType": "checkbox" if field_type == "/Btn" else "text",
                    "width": width,
                }
            )

    label_groups: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(list)
    for field in raw_fields:
        label_groups[(field["page"], field["fieldLabelBase"])].append(field)

    for group in label_groups.values():
        group.sort(key=lambda field: (field["top"], field["left"]))
        group_size = len(group)

        for position, field in enumerate(group, start=1):
            if group_size > 1:
                field["fieldLabel"] = f"{field['fieldLabelBase']} ({position} of {group_size})"
            else:
                field["fieldLabel"] = field["fieldLabelBase"]

            field["badge"] = derive_badge(field["page"], field["index"], field["fieldLabelBase"])
            del field["fieldLabelBase"]

    raw_fields.sort(key=lambda field: (field["page"], field["top"], field["left"]))

    output = {
        "excludedFields": excluded_fields,
        "fields": raw_fields,
        "numberOfFields": len(raw_fields),
        "numberOfPages": len(reader.pages),
        "sourceLayout": str(layout_path),
        "sourcePdf": str(pdf_path),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(f"{json.dumps(output, indent=2)}\n")


if __name__ == "__main__":
    main()
