package expo.modules.ocrscanner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OcrScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("OcrScanner")

    AsyncFunction("setValueAsync") { value: String ->
    }
  }
}
