' Run bridge in background (no window). Logs go to logs\bridge-bg.log
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
project = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
logDir = project & "\logs"
logFile = logDir & "\bridge-bg.log"

If Not fso.FolderExists(logDir) Then
  fso.CreateFolder(logDir)
End If

shell.CurrentDirectory = project
shell.Run "cmd /c npm start >> logs\bridge-bg.log 2>&1", 0, False
