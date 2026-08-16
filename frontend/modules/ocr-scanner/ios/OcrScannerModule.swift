import ExpoModulesCore
import Vision
import UIKit

enum OcrScannerError: Error {
  case invalidImage
}

public class OcrScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OcrScanner")

    AsyncFunction("recognizeText") { (imageUri: String) -> [String] in
      guard let url = URL(string: imageUri),
            let imageData = try? Data(contentsOf: url),
            let image = UIImage(data: imageData),
            let cgImage = image.cgImage else {
        throw OcrScannerError.invalidImage
      }

      return try await self.performTextRecognition(on: cgImage)
    }
  }

  private func performTextRecognition(on cgImage: CGImage) async throws -> [String] {
    try await withCheckedThrowingContinuation { continuation in
      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          continuation.resume(throwing: error)
          return
        }

        guard let observations = request.results as? [VNRecognizedTextObservation] else {
          continuation.resume(returning: [])
          return
        }

        let recognizedStrings = observations.compactMap { observation in
          observation.topCandidates(1).first?.string
        }

        continuation.resume(returning: recognizedStrings)
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.recognitionLanguages = ["es-MX", "en-US"]

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

      do {
        try handler.perform([request])
      } catch {
        continuation.resume(throwing: error)
      }
    }
  }
}
