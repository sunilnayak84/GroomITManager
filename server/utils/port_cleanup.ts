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
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!portIsFree && attempts < maxAttempts) {
      try {
        // Try multiple methods to check if port is free
        attempts++;
        console.log(`[PORT_CLEANUP] Verification attempt ${attempts}/${maxAttempts}`);
        
        // First method: lsof
        try {
          const { stdout } = await execAsync(`lsof -t -i:${port}`);
          if (!stdout.trim()) {
            portIsFree = true;
            break;
          }
          
          // If we get here, port is still in use - try to kill processes forcefully
          console.log(`[PORT_CLEANUP] Port ${port} still in use, attempting forceful termination`);
          const remainingPids = stdout.trim().split('\n').filter(Boolean);
          for (const pid of remainingPids) {
            try {
              await execAsync(`kill -9 ${pid}`); // Use shell command for more reliability
              console.log(`[PORT_CLEANUP] Forcefully terminated process ${pid}`);
            } catch (error) {
              console.log(`[PORT_CLEANUP] Failed to kill process ${pid}:`, error);
            }
          }
        } catch {
          // lsof returns error when no process is using the port
          portIsFree = true;
          break;
        }
        
        // Second method: Try to bind to the port directly as a test
        if (!portIsFree) {
          try {
            const testServer = require('net').createServer();
            await new Promise<void>((resolve, reject) => {
              testServer.once('error', (err: any) => {
                testServer.close();
                if (err.code === 'EADDRINUSE') {
                  reject(new Error('Port still in use'));
                } else {
                  reject(err);
                }
              });
              testServer.once('listening', () => {
                testServer.close();
                resolve();
              });
              testServer.listen(port);
            });
            portIsFree = true;
          } catch (error) {
            console.log(`[PORT_CLEANUP] Port binding test failed:`, error);
            // Port still in use, wait a bit before next attempt
            await wait(1000);
          }
        }
      } catch (error) {
        console.log(`[PORT_CLEANUP] Verification error:`, error);
        await wait(1000);
      }
    }

    if (portIsFree) {
      console.log(`[PORT_CLEANUP] Port ${port} is now available`);
      success = true;
    } else {
      console.warn(`[PORT_CLEANUP] Warning: Port ${port} might still be in use after ${maxAttempts} attempts`);
      // One final desperate attempt - use direct shell command
      try {
        // This is more aggressive and might require sudo in some environments
        await execAsync(`pkill -f "node.*:${port}" || true`);
        await execAsync(`fuser -k ${port}/tcp || true`);
        success = true;
      } catch (error) {
        console.warn(`[PORT_CLEANUP] Final cleanup attempt failed:`, error);
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
