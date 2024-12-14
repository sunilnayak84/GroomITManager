import { extendTheme } from '@chakra-ui/react';
import type { ThemeConfig, StyleFunctionProps, ThemeComponents } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
};

const components: ThemeComponents = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
    },
    variants: {
      solid: (props: StyleFunctionProps) => ({
        bg: props.colorMode === 'light' ? 'brand.500' : 'brand.200',
        color: props.colorMode === 'light' ? 'white' : 'gray.800',
        _hover: {
          bg: props.colorMode === 'light' ? 'brand.600' : 'brand.300',
        },
      }),
      outline: (props: StyleFunctionProps) => ({
        borderColor: props.colorMode === 'light' ? 'brand.500' : 'brand.200',
        color: props.colorMode === 'light' ? 'brand.500' : 'brand.200',
        _hover: {
          bg: props.colorMode === 'light' ? 'brand.50' : 'whiteAlpha.100',
        },
      }),
    },
  },
  Input: {
    variants: {
      filled: (props: StyleFunctionProps) => ({
        field: {
          bg: props.colorMode === 'light' ? 'gray.100' : 'whiteAlpha.50',
          _hover: {
            bg: props.colorMode === 'light' ? 'gray.200' : 'whiteAlpha.100',
          },
          _focus: {
            bg: props.colorMode === 'light' ? 'gray.200' : 'whiteAlpha.100',
          },
        },
      }),
    },
    defaultProps: {
      variant: 'filled',
    },
  },
};

const styles = {
  global: (props: StyleFunctionProps) => ({
    body: {
      bg: props.colorMode === 'light' ? 'white' : 'gray.800',
      color: props.colorMode === 'light' ? 'gray.800' : 'whiteAlpha.900',
    },
  }),
};

const theme = extendTheme({
  config,
  colors,
  components,
  styles,
});

export default theme;
