import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TERMINATION_DELAY = 1000;

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      server.close();
      if (err.code === 'EADDRINUSE') {
        console.log(`[PORT_CHECK] Port ${port} is in use`);
        resolve(true);
      } else {
        console.log(`[PORT_CHECK] Error checking port ${port}:`, err);
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      console.log(`[PORT_CHECK] Port ${port} is available`);
      resolve(false);
    });

    server.listen(port, '0.0.0.0');
  });
}

async function killProcessOnPort(port: number, attempt: number = 1): Promise<boolean> {
  console.log(`[PORT_CLEANUP] Attempt ${attempt} to kill process on port ${port}`);
  
  try {
    // Try Unix command first (lsof)
    const { stdout } = await execAsync(`lsof -t -i:${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      console.log(`[PORT_CLEANUP] Found ${pids.length} process(es) using port ${port}`);
      
      for (const pid of pids) {
        try {
          // Try SIGTERM first
          process.kill(Number(pid), 'SIGTERM');
          console.log(`[PORT_CLEANUP] Sent SIGTERM to process ${pid}`);
          await wait(TERMINATION_DELAY);
          
          // Check if process is still running
          try {
            process.kill(Number(pid), 0);
            console.log(`[PORT_CLEANUP] Process ${pid} still alive, sending SIGKILL`);
            process.kill(Number(pid), 'SIGKILL');
            await wait(TERMINATION_DELAY);
          } catch {
            console.log(`[PORT_CLEANUP] Process ${pid} terminated successfully`);
          }
        } catch (killError) {
          console.error(`[PORT_CLEANUP] Error terminating process ${pid}:`, killError);
        }
      }
    }
    
    // Verify port is now available
    return !(await isPortInUse(port));
  } catch (unixError) {
    console.log(`[PORT_CLEANUP] Unix method failed:`, unixError instanceof Error ? unixError.message : 'Unknown error');
    console.log(`[PORT_CLEANUP] Trying Windows method...`);
    
    try {
      // Try Windows method (netstat)
      const { stdout: netstatOutput } = await execAsync(`netstat -ano | findstr :${port}`);
      const pidMatches = netstatOutput.match(/\s+(\d+)\s*$/gm);
      
      if (pidMatches && pidMatches.length > 0) {
        console.log(`[PORT_CLEANUP] Found ${pidMatches.length} processes using port ${port}`);
        for (const pidMatch of pidMatches) {
          const pid = pidMatch.trim();
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`[PORT_CLEANUP] Terminated Windows process ${pid}`);
            await wait(TERMINATION_DELAY);
          } catch (killError) {
            console.error(`[PORT_CLEANUP] Failed to terminate Windows process ${pid}:`, 
              killError instanceof Error ? killError.message : 'Unknown error');
          }
        }
      }
      
      // Verify port is now available
      return !(await isPortInUse(port));
    } catch (windowsError) {
      console.log(`[PORT_CLEANUP] Windows method failed`);
      return false;
    }
  }
}

export async function terminateProcessOnPort(port: number): Promise<void> {
  console.log(`[PORT_CLEANUP] Starting cleanup for port ${port}...`);
  
  let attempt = 1;
  while (attempt <= MAX_RETRIES) {
    try {
      if (!(await isPortInUse(port))) {
        console.log(`[PORT_CLEANUP] Port ${port} is already available`);
        return;
      }
      
      const success = await killProcessOnPort(port, attempt);
      if (success) {
        console.log(`[PORT_CLEANUP] Successfully cleaned up port ${port}`);
        return;
      }
      
      console.log(`[PORT_CLEANUP] Attempt ${attempt} failed, waiting before retry...`);
      await wait(RETRY_DELAY);
      attempt++;
    } catch (error) {
      console.error(`[PORT_CLEANUP] Error in cleanup attempt ${attempt}:`, error);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to clean up port ${port} after ${MAX_RETRIES} attempts`);
      }
      await wait(RETRY_DELAY);
      attempt++;
    }
  }
  
  throw new Error(`Failed to clean up port ${port} after ${MAX_RETRIES} attempts`);
}