import { useEffect, useState } from "react";

import {
  buildForm1040Snapshot,
  createEmptyForm1040Snapshot,
  type Form1040DatabaseSnapshot,
} from "./form-1040-model";

export interface UseForm1040Result {
  error: string | null;
  isLoaded: boolean;
  snapshot: Form1040DatabaseSnapshot;
}

export function useForm1040(): UseForm1040Result {
  const [snapshot, setSnapshot] = useState<Form1040DatabaseSnapshot>(createEmptyForm1040Snapshot());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSnapshot(buildForm1040Snapshot({}));
    setIsLoaded(true);
  }, []);

  return {
    error: null,
    isLoaded,
    snapshot,
  };
}
