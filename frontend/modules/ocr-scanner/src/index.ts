import { requireNativeModule } from 'expo-modules-core';

interface OcrScannerModuleType {
  recognizeText(imageUri: string): Promise<string[]>;
}

const nativeModule = requireNativeModule<OcrScannerModuleType>('OcrScanner');

// Recibe la URI local de una imagen (ej. "file:///.../foto.jpg") y regresa
// un arreglo con cada línea de texto que Vision Framework detectó en la foto.
export async function recognizeText(imageUri: string): Promise<string[]> {
  return nativeModule.recognizeText(imageUri);
}
