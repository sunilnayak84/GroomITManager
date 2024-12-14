import { extendTheme } from "@chakra-ui/react";
import type { ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

const colors = {
  brand: {
    50: 'hsl(270, 100%, 98%)',
    100: 'hsl(270, 100%, 94%)',
    200: 'hsl(270, 100%, 88%)',
    300: 'hsl(270, 100%, 82%)',
    400: 'hsl(270, 100%, 76%)',
    500: 'hsl(270, 100%, 70%)',
    600: 'hsl(270, 100%, 64%)',
    700: 'hsl(270, 100%, 58%)',
    800: 'hsl(270, 100%, 52%)',
    900: 'hsl(270, 100%, 46%)',
  },
  primary: {
    50: 'hsl(262, 83%, 98%)',
    100: 'hsl(262, 83%, 94%)',
    200: 'hsl(262, 83%, 88%)',
    300: 'hsl(262, 83%, 82%)',
    400: 'hsl(262, 83%, 76%)',
    500: 'hsl(262, 83%, 58%)',
    600: 'hsl(262, 83%, 52%)',
    700: 'hsl(262, 83%, 46%)',
    800: 'hsl(262, 83%, 40%)',
    900: 'hsl(262, 83%, 34%)',
  },
  secondary: {
    50: 'hsl(210, 40%, 98%)',
    100: 'hsl(210, 40%, 94%)',
    200: 'hsl(210, 40%, 88%)',
    300: 'hsl(210, 40%, 82%)',
    400: 'hsl(210, 40%, 76%)',
    500: 'hsl(210, 40%, 70%)',
    600: 'hsl(210, 40%, 64%)',
    700: 'hsl(210, 40%, 58%)',
    800: 'hsl(210, 40%, 52%)',
    900: 'hsl(210, 40%, 46%)',
  }
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
      transition: 'all 0.2s',
    },
    variants: {
      solid: {
        bg: 'primary.500',
        color: 'white',
        _hover: {
          bg: 'primary.600',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
          _disabled: {
            bg: 'primary.500',
            transform: 'none',
            boxShadow: 'none',
          },
        },
        _active: {
          bg: 'primary.700',
          transform: 'translateY(0)',
          boxShadow: 'md',
        },
      },
      outline: {
        borderColor: 'primary.500',
        color: 'primary.500',
        _hover: {
          bg: 'primary.50',
          transform: 'translateY(-1px)',
          boxShadow: 'sm',
        },
        _active: {
          bg: 'primary.100',
          transform: 'translateY(0)',
        },
      },
      ghost: {
        color: 'primary.500',
        _hover: {
          bg: 'primary.50',
          transform: 'translateY(-1px)',
        },
        _active: {
          bg: 'primary.100',
          transform: 'translateY(0)',
        },
      },
    },
    defaultProps: {
      variant: 'solid',
    },
  },
  Card: {
    baseStyle: {
      p: '6',
      bg: 'white',
      rounded: 'lg',
      boxShadow: 'lg',
      transition: 'all 0.2s',
      _hover: {
        transform: 'translateY(-2px)',
        boxShadow: 'xl',
      },
      _dark: {
        bg: 'gray.800',
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: 'gray.200',
          transition: 'all 0.2s',
          _hover: {
            borderColor: 'primary.500',
          },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
          },
        },
      },
    },
    defaultProps: {
      variant: 'outline',
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  components,
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
        _dark: {
          bg: 'gray.900',
          color: 'white',
        },
      },
    },
  },
});

export default theme;
