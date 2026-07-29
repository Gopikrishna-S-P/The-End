import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Camera, X } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from '@/components/ui';

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

interface PhotoPickerProps {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  max?: number;
  label?: string;
}

// A modern phone camera easily captures 12+ MP (4000x3000+) -- far more resolution than
// needed for a legible proof-of-visit/receipt photo, and slow/expensive to upload over a
// field data connection. Downscale so the longest edge is at most this many px.
const MAX_DIMENSION = 1600;

export function PhotoPicker({ photos, onChange, max = 3, label = 'Photos' }: PhotoPickerProps) {
  const { colors, spacing, radius } = useTheme();
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError('Camera access is needed to take a photo. Enable it in your device settings.');
      return;
    }
    setPermissionError(null);

    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    let uri = asset.uri;

    if (asset.width > MAX_DIMENSION || asset.height > MAX_DIMENSION) {
      try {
        const context = ImageManipulator.manipulate(asset.uri);
        const resized = asset.width >= asset.height
          ? context.resize({ width: MAX_DIMENSION })
          : context.resize({ height: MAX_DIMENSION });
        const rendered = await resized.renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
        uri = saved.uri;
      } catch {
        // Best-effort -- fall back to the original, unresized capture rather than
        // blocking the photo entirely over a resize failure.
      }
    }

    const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
    onChange([...photos, { uri, name, type: asset.mimeType ?? 'image/jpeg' }]);
  };

  const removeAt = (index: number) => onChange(photos.filter((_, i) => i !== index));

  return (
    <View style={{ gap: spacing.s2 }}>
      <Text variant="label" color="secondary">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 }}>
        {photos.map((photo, index) => (
          <View key={photo.uri} style={{ position: 'relative' }}>
            <Image source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: radius.md }} />
            <Pressable
              onPress={() => removeAt(index)}
              style={{
                position: 'absolute', top: -6, right: -6, backgroundColor: colors.error,
                borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={12} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <Pressable
            onPress={takePhoto}
            style={{
              width: 72, height: 72, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed',
              borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.subtle,
            }}
          >
            <Camera size={20} color={colors.ink3} />
          </Pressable>
        ) : null}
      </View>
      {permissionError ? <Text variant="caption" color="error">{permissionError}</Text> : null}
    </View>
  );
}
