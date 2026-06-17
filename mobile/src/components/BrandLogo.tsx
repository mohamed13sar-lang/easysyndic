import { Image } from 'expo-image';
import { ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { brandAssets } from '@/constants/assets';

type BrandLogoProps = {
  variant?: 'main' | 'dark' | 'mark' | 'icon' | 'stacked';
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function BrandLogo({ variant = 'main', style, containerStyle }: BrandLogoProps) {
  const source =
    variant === 'dark'
      ? brandAssets.darkLogo
      : variant === 'mark'
        ? brandAssets.logoMark
        : variant === 'icon'
          ? brandAssets.appIcon
          : variant === 'stacked'
            ? brandAssets.stackedLogo
            : brandAssets.mainLogo;

  return (
    <View style={[styles.container, containerStyle]}>
      <Image source={source} style={[styles.logo, logoStyles[variant], style]} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  logo: {
    width: 190,
    height: 70,
  },
});

const logoStyles = StyleSheet.create({
  main: {
    width: 200,
    height: 78,
  },
  dark: {
    width: 200,
    height: 78,
  },
  mark: {
    width: 48,
    height: 48,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  stacked: {
    width: 170,
    height: 140,
  },
});
