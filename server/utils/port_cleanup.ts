import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function terminateProcessOnPort(port: number): Promise<void> {
  try {
    console.log(`[PORT_CLEANUP] Attempting to clean up port ${port}...`);
    
    let success = false;
    
    // Try Unix command first (lsof)
    try {
      const { stdout } = await execAsync(`lsof -t -i:${port}`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      if (pids.length > 0) {
        console.log(`[PORT_CLEANUP] Found ${pids.length} process(es) using port ${port}`);
        
        // Try SIGTERM first, then SIGKILL if needed
        for (const pid of pids) {
          try {
            process.kill(Number(pid), 'SIGTERM');
            console.log(`[PORT_CLEANUP] Sent SIGTERM to process ${pid}`);
            await wait(500); // Give process time to terminate gracefully
            
            try {
              // Check if process is still running
              process.kill(Number(pid), 0);
              console.log(`[PORT_CLEANUP] Process ${pid} still alive, sending SIGKILL`);
              process.kill(Number(pid), 'SIGKILL');
            } catch {
              // Process already terminated
              console.log(`[PORT_CLEANUP] Process ${pid} terminated successfully`);
              success = true;
            }
          } catch (killError) {
            console.error(`[PORT_CLEANUP] Error terminating process ${pid}:`, killError);
          }
        }
      } else {
        console.log(`[PORT_CLEANUP] No processes found using port ${port} (Unix)`);
        success = true;
      }
    } catch (unixError) {
      console.log(`[PORT_CLEANUP] Unix method failed, trying Windows method...`);
      
      // Try Windows command (netstat)
      try {
        const { stdout: netstatOutput } = await execAsync(`netstat -ano | findstr :${port}`);
        const pidMatches = netstatOutput.match(/\s+(\d+)\s*$/gm);
        
        if (pidMatches && pidMatches.length > 0) {
          console.log(`[PORT_CLEANUP] Found processes on Windows using port ${port}`);
          
          for (const pidMatch of pidMatches) {
            const pid = pidMatch.trim();
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`[PORT_CLEANUP] Terminated Windows process ${pid}`);
              success = true;
            } catch (killError) {
              console.error(`[PORT_CLEANUP] Failed to terminate Windows process ${pid}:`, killError);
            }
          }
        } else {
          console.log(`[PORT_CLEANUP] No processes found using port ${port} (Windows)`);
          success = true;
        }
      } catch (windowsError) {
        console.log(`[PORT_CLEANUP] Windows method failed`);
      }
    }

    // Final verification
    await wait(1000); // Wait for processes to fully terminate
    
    let portIsFree = false;
    try {
      const { stdout } = await execAsync(`lsof -t -i:${port}`);
      portIsFree = !stdout.trim();
    } catch {
      // lsof returns error when no process is using the port
      portIsFree = true;
    }

    if (portIsFree) {
      console.log(`[PORT_CLEANUP] Port ${port} is now available`);
      success = true;
    } else if (!success) {
      console.warn(`[PORT_CLEANUP] Warning: Port ${port} might still be in use`);
      // One final attempt with SIGKILL
      try {
        const { stdout } = await execAsync(`lsof -t -i:${port}`);
        const remainingPids = stdout.trim().split('\n').filter(Boolean);
        for (const pid of remainingPids) {
          try {
            process.kill(Number(pid), 'SIGKILL');
            success = true;
          } catch {
            // Ignore errors in final cleanup
          }
        }
      } catch {
        // Ignore errors in final cleanup
      }
    }

    if (!success) {
      throw new Error(`Failed to clean up port ${port}`);
    }
  } catch (error) {
    console.error(`[PORT_CLEANUP] Error during port cleanup:`, error);
    throw error; // Re-throw to handle in the caller
  }
}
