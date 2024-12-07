// Simple toast utility without external dependencies
export const toast = {
  success: (message: string) => {
    console.log(`Success: ${message}`);
    // You can replace this with a custom notification method if needed
    alert(message);
  },
  error: (message: string) => {
    console.error(`Error: ${message}`);
    // You can replace this with a custom notification method if needed
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
    console.info(`Info: ${message}`);
    alert(message);
  },
  warning: (message: string) => {
    console.warn(`Warning: ${message}`);
    alert(`Warning: ${message}`);
  },
  default: (message: string) => {
    console.log(message);
    alert(message);
  }
};
