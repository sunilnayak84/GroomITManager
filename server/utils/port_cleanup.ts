import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function terminateProcessOnPort(port: number): Promise<void> {
  try {
    console.log(`Attempting to clean up port ${port}...`);
    
    // For Unix-like systems (Linux/Mac)
    try {
      // Find processes using the port
      const { stdout } = await execAsync(`lsof -t -i:${port}`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      if (pids.length === 0) {
        console.log(`No processes found running on port ${port}.`);
        return;
      }

      // First try SIGTERM
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGTERM');
          console.log(`Sent SIGTERM to process ${pid} on port ${port}.`);
        } catch (termError) {
          console.warn(`SIGTERM failed for process ${pid}, trying SIGKILL:`, termError);
          try {
            process.kill(Number(pid), 'SIGKILL');
            console.log(`Sent SIGKILL to process ${pid} on port ${port}.`);
          } catch (killError) {
            console.error(`Failed to terminate process ${pid}:`, killError);
          }
        }
      }

      // Wait a bit for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (lsofError) {
      // lsof command failed, try Windows command
      try {
        const { stdout: windowsStdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const pidMatches = windowsStdout.match(/\s+(\d+)\s*$/gm);
        
        if (pidMatches) {
          for (const pidMatch of pidMatches) {
            const pid = pidMatch.trim();
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`Terminated process with PID ${pid} running on port ${port}.`);
            } catch (killError) {
              console.error(`Failed to terminate Windows process ${pid}:`, killError);
            }
          }
        }
      } catch (windowsError) {
        console.log(`No processes found running on port ${port} (Windows).`);
      }
    }

    // Verify port is free
    try {
      await execAsync(`lsof -t -i:${port}`);
      console.warn(`Port ${port} might still be in use after cleanup attempt.`);
    } catch {
      console.log(`Port ${port} is now free.`);
    }
  } catch (error) {
    console.error(`Error cleaning up port ${port}:`, error);
  }
}
