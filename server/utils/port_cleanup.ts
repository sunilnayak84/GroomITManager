import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function terminateProcessOnPort(port: number): Promise<void> {
  try {
    console.log(`[PORT_CLEANUP] Attempting to clean up port ${port}...`);
    
    // First try Unix-like systems (Linux/Mac)
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
            } catch (e) {
              // Process already terminated
              console.log(`[PORT_CLEANUP] Process ${pid} terminated successfully`);
            }
          } catch (killError) {
            console.error(`[PORT_CLEANUP] Error terminating process ${pid}:`, killError);
          }
        }
      }
    } catch (unixError) {
      // lsof failed, try Windows commands
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
            } catch (killError) {
              console.error(`[PORT_CLEANUP] Failed to terminate Windows process ${pid}:`, killError);
            }
          }
        }
      } catch (windowsError) {
        // Both Unix and Windows methods failed
        console.log(`[PORT_CLEANUP] No processes found using port ${port}`);
      }
    }

    // Final verification
    await wait(1000); // Wait for processes to fully terminate
    
    let portIsFree = false;
    try {
      await execAsync(`lsof -t -i:${port}`);
    } catch {
      // lsof returns error when no process is using the port
      portIsFree = true;
    }

    if (portIsFree) {
      console.log(`[PORT_CLEANUP] Port ${port} is now available`);
    } else {
      console.warn(`[PORT_CLEANUP] Warning: Port ${port} might still be in use`);
      // One final attempt with SIGKILL
      try {
        const { stdout } = await execAsync(`lsof -t -i:${port}`);
        const remainingPids = stdout.trim().split('\n').filter(Boolean);
        for (const pid of remainingPids) {
          try {
            process.kill(Number(pid), 'SIGKILL');
          } catch (e) {
            // Ignore errors in final cleanup
          }
        }
      } catch {
        // Ignore errors in final cleanup
      }
    }
  } catch (error) {
    console.error(`[PORT_CLEANUP] Error during port cleanup:`, error);
  }
}
