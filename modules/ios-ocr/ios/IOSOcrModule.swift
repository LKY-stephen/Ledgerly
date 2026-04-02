import ExpoModulesCore
import Foundation
import UIKit
import Vision

enum IOSOcrError: Error {
  case invalidUri(String)
  case unreadableFile(String)
  case invalidImage(String)
  case visionFailure(String)
}

public class IOSOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IOSOcr")

    AsyncFunction("recognizeTextFromImage") { (uri: String) async throws -> [String: Any] in
      let result = try await Self.recognize(uri: uri)
      return [
        "lines": result.lines,
        "text": result.text,
        "parser": "ios_vision_ocr"
      ]
    }
  }

  private struct OCRResult {
    let lines: [String]
    let text: String
  }

  private static func recognize(uri: String) async throws -> OCRResult {
    let fileURL = try fileURL(from: uri)
    let image = try loadImage(from: fileURL)
    let handler = try makeRequestHandler(for: image)

    return try await withCheckedThrowingContinuation { continuation in
      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          continuation.resume(throwing: IOSOcrError.visionFailure(error.localizedDescription))
          return
        }

        let observations = request.results as? [VNRecognizedTextObservation] ?? []
        let lines = observations.compactMap { observation in
          observation.topCandidates(1).first?.string
        }.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

        let normalized = lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        continuation.resume(returning: OCRResult(lines: lines, text: normalized))
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          continuation.resume(throwing: IOSOcrError.visionFailure(error.localizedDescription))
        }
      }
    }
  }

  private static func fileURL(from uri: String) throws -> URL {
    if uri.hasPrefix("file://") {
      guard let url = URL(string: uri) else {
        throw IOSOcrError.invalidUri(uri)
      }
      return url
    }

    if uri.hasPrefix("/") {
      return URL(fileURLWithPath: uri)
    }

    throw IOSOcrError.invalidUri(uri)
  }

  private static func loadImage(from url: URL) throws -> UIImage {
    guard let data = try? Data(contentsOf: url) else {
      throw IOSOcrError.unreadableFile(url.path)
    }
    guard let image = UIImage(data: data) else {
      throw IOSOcrError.invalidImage(url.path)
    }
    return image
  }

  private static func makeRequestHandler(for image: UIImage) throws -> VNImageRequestHandler {
    if let cgImage = image.cgImage {
      return VNImageRequestHandler(cgImage: cgImage, options: [:])
    }

    if let ciImage = image.ciImage {
      return VNImageRequestHandler(ciImage: ciImage, options: [:])
    }

    throw IOSOcrError.invalidImage("No CGImage or CIImage backing")
  }
}
