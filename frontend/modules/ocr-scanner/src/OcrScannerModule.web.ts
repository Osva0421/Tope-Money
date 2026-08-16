import { registerWebModule, NativeModule } from 'expo';

class OcrScannerModule extends NativeModule<{}> {
  async setValueAsync(value: string): Promise<void> {}
}

export default registerWebModule(OcrScannerModule, 'OcrScannerModule');
