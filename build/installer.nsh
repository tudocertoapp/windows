; UTF-8 — NSIS Unicode (electron-builder)
; MUI2 já define Function .onGUIInit — usar apenas função personalizada (Modern UI 2).
; Só no instalador: na passagem BUILD_UNINSTALLER a função não existe (bloco !ifndef abaixo).
!ifndef BUILD_UNINSTALLER
!define MUI_CUSTOMFUNCTION_GUIINIT tcInstallerBringToFront
!endif
; Requer package.json nsis.perMachine: true (instalação para todos, sem escolha).
; customInit: após initMultiUser — deteta instalação anterior; em modo silencioso desinstala já.
; Atualizar/Cancelar: diálogo nativo (PowerShell + WinForms) em .onInit, logo após o UAC — antes de qualquer página (incl. pasta).
; Código gravado em $TEMP e executado com -STA; exit 6 = Atualizar, 7 = Cancelar.
; Chaves de registo: usar APP_GUID e UNINSTALL_APP_KEY (-D do electron-builder), não GUID fixo —
; UNINSTALL_REGISTRY_KEY usa UNINSTALL_APP_KEY (pode diferir de APP_GUID em casos raros).

!macro customHeader
  ManifestDPIAware true
!macroend

!macro preInit
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM "${PRODUCT_FILENAME}.exe" /T >nul 2>&1 & exit /b 0'
  Sleep 1200
!macroend

; Código abaixo só entra no script principal do instalador. Na passagem BUILD_UNINSTALLER
; o electron-builder não chama customInit nas passagens BUILD_UNINSTALLER — funções órfãs geram aviso 6010 (erro).

!ifndef BUILD_UNINSTALLER

Var tcHasPrev
Var tcUninstLM
Var tcUninstCU
Var tcInstDirLM
Var tcInstDirCU
Var tcTmpUStr
Var tcTmpUDir
Var tcTmpUArgs

Function tcStripQuotes
  Exch $R0
  Push $R1
  Push $R2
  Push $R3
  StrCpy $R2 -1
  tcSq1:
  IntOp $R2 $R2 + 1
  StrCpy $R3 $R0 1 $R2
  StrCmp $R3 "" tcSqDone
  StrCmp $R3 '"' 0 tcSq1
  IntOp $R2 $R2 + 1
  StrCpy $R0 $R0 "" $R2
  StrCpy $R2 0
  tcSq2:
  IntOp $R2 $R2 + 1
  StrCpy $R3 $R0 1 $R2
  StrCmp $R3 "" tcSqDone
  StrCmp $R3 '"' 0 tcSq2
  StrCpy $R0 $R0 $R2
  tcSqDone:
  Pop $R3
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

Function tcParentDir
  Exch $R0
  Push $R1
  Push $R2
  Push $R3
  StrCpy $R1 0
  StrLen $R2 $R0
  tcPl:
  IntOp $R1 $R1 + 1
  IntCmp $R1 $R2 tcPg 0 tcPg
  StrCpy $R3 $R0 1 -$R1
  StrCmp $R3 "\" tcPg +1
  Goto tcPl
  tcPg:
  StrCpy $R0 $R0 -$R1
  Pop $R3
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

Function tcDetectPrevious
  StrCpy $tcHasPrev "0"
  StrCpy $tcUninstLM ""
  StrCpy $tcUninstCU ""
  StrCpy $tcInstDirLM ""
  StrCpy $tcInstDirCU ""

  ; Mesmas chaves que o electron-builder (multiUser.nsh / installUtil.nsh)
  ReadRegStr $tcUninstLM HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" UninstallString
  ReadRegStr $tcInstDirLM HKLM "Software\${APP_GUID}" InstallLocation
  StrCmp $tcUninstLM "" 0 tcDet_lm_done
  !ifdef UNINSTALL_REGISTRY_KEY_2
    ReadRegStr $tcUninstLM HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" UninstallString
  !endif
  tcDet_lm_done:

  ReadRegStr $tcUninstCU HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" UninstallString
  ReadRegStr $tcInstDirCU HKCU "Software\${APP_GUID}" InstallLocation
  StrCmp $tcUninstCU "" 0 tcDet_cu_done
  !ifdef UNINSTALL_REGISTRY_KEY_2
    ReadRegStr $tcUninstCU HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" UninstallString
  !endif
  tcDet_cu_done:

  StrCmp $tcUninstLM "" 0 tcMarkPrev
  StrCmp $tcUninstCU "" 0 tcMarkPrev
  StrCmp $tcInstDirLM "" 0 tcMarkPrev
  StrCmp $tcInstDirCU "" 0 tcMarkPrev

  ; initMultiUser já definiu $INSTDIR para a pasta anterior quando há InstallLocation
  IfFileExists "$INSTDIR\${PRODUCT_FILENAME}.exe" tcMarkPrev

  IfFileExists "$LOCALAPPDATA\Programs\tudocerto\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$LOCALAPPDATA\Programs\${PRODUCT_FILENAME}\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$PROGRAMFILES64\tudocerto\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$PROGRAMFILES32\tudocerto\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$PROGRAMFILES\tudocerto\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$PROGRAMFILES64\${PRODUCT_FILENAME}\${PRODUCT_FILENAME}.exe" tcMarkPrev
  IfFileExists "$PROGRAMFILES32\${PRODUCT_FILENAME}\${PRODUCT_FILENAME}.exe" tcMarkPrev
  Return

  tcMarkPrev:
  StrCpy $tcHasPrev "1"
FunctionEnd

Function tcWipeAppRegistry
  DeleteRegKey HKCU "Software\${APP_GUID}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
  !endif
  DeleteRegKey HKLM "Software\${APP_GUID}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  !ifdef UNINSTALL_REGISTRY_KEY_2
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
  !endif
FunctionEnd

Function tcRunOneUninst
  StrCmp $tcTmpUStr "" tcRUdone

  Push $tcTmpUStr
  Call tcStripQuotes
  Pop $R3
  StrCmp $R3 "" tcRUdone

  StrCmp $tcTmpUDir "" tcRU_needParent
  Goto tcRU_gotParent
  tcRU_needParent:
  Push $R3
  Call tcParentDir
  Pop $tcTmpUDir
  tcRU_gotParent:

  StrCpy $R4 "$TEMP\TudoCerto_old_uninst.exe"
  Delete /REBOOTOK $R4
  ClearErrors
  CopyFiles /SILENT $R3 $R4
  IfErrors tcRU_useInPlace
  StrCpy $R5 $R4
  Goto tcRU_exec
  tcRU_useInPlace:
  StrCpy $R5 $R3

  tcRU_exec:
  ; electron-builder usa --updated (installUtil.nsh), não /updated
  ExecWait '"$R5" /S /KEEP_APP_DATA$tcTmpUArgs --updated _?=$tcTmpUDir' $R0
  StrCmp $R5 $R4 tcRU_delTmp
  Goto tcRU_afterDel
  tcRU_delTmp:
  Delete /REBOOTOK $R4
  tcRU_afterDel:

  tcRUdone:
FunctionEnd

Function tcRunAllUninstalls
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM "${PRODUCT_FILENAME}.exe" /T >nul 2>&1 & exit /b 0'
  Sleep 1500

  StrCmp $tcUninstLM "" +5
  StrCpy $tcTmpUStr $tcUninstLM
  StrCpy $tcTmpUDir $tcInstDirLM
  StrCpy $tcTmpUArgs " /allusers"
  Call tcRunOneUninst

  StrCmp $tcUninstCU "" +5
  StrCpy $tcTmpUStr $tcUninstCU
  StrCpy $tcTmpUDir $tcInstDirCU
  StrCpy $tcTmpUArgs " /currentuser"
  Call tcRunOneUninst

  Sleep 2000

  Call tcWipeAppRegistry

  StrCmp $INSTDIR "" tcSkipRmInst
  RMDir /r /REBOOTOK "$INSTDIR"
  tcSkipRmInst:

  RMDir /r /REBOOTOK "$LOCALAPPDATA\Programs\tudocerto"
  RMDir /r /REBOOTOK "$LOCALAPPDATA\Programs\Tudo Certo"
  RMDir /r /REBOOTOK "$PROGRAMFILES64\tudocerto"
  RMDir /r /REBOOTOK "$PROGRAMFILES32\tudocerto"
  RMDir /r /REBOOTOK "$PROGRAMFILES\tudocerto"
  RMDir /r /REBOOTOK "$PROGRAMFILES64\Tudo Certo"
  RMDir /r /REBOOTOK "$PROGRAMFILES32\Tudo Certo"
  RMDir /r /REBOOTOK "$PROGRAMFILES\Tudo Certo"
  RMDir /r /REBOOTOK "$PROGRAMFILES64\${PRODUCT_FILENAME}"
  RMDir /r /REBOOTOK "$PROGRAMFILES32\${PRODUCT_FILENAME}"
FunctionEnd

Function tcPromptUpdateAfterUac
  StrCmp $tcHasPrev "1" 0 tcPU_out
  IfSilent tcPU_out

  ClearErrors
  FileOpen $R8 "$TEMP\TudoCerto_update_ui.ps1" w
  IfErrors tcPU_err_open
  FileWrite $R8 "Add-Type -AssemblyName System.Drawing, System.Windows.Forms$\r$\n"
  FileWrite $R8 "[System.Windows.Forms.Application]::EnableVisualStyles()$\r$\n"
  FileWrite $R8 "[System.Windows.Forms.Application]::SetCompatibleTextRenderingDefault($$false)$\r$\n"
  FileWrite $R8 "$$g = New-Object System.Windows.Forms.Form$\r$\n"
  FileWrite $R8 "$$g.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi$\r$\n"
  FileWrite $R8 "$$g.Text = 'Instalacao do Tudo Certo'$\r$\n"
  FileWrite $R8 "$$g.ClientSize = New-Object System.Drawing.Size(380, 120)$\r$\n"
  FileWrite $R8 "$$g.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog$\r$\n"
  FileWrite $R8 "$$g.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen$\r$\n"
  FileWrite $R8 "$$g.MaximizeBox = $$false$\r$\n"
  FileWrite $R8 "$$g.MinimizeBox = $$false$\r$\n"
  FileWrite $R8 "$$t = New-Object System.Windows.Forms.Label$\r$\n"
  FileWrite $R8 "$$t.Text = 'O Tudo Certo ja esta instalado.'$\r$\n"
  FileWrite $R8 "$$t.Location = New-Object System.Drawing.Point(16, 16)$\r$\n"
  FileWrite $R8 "$$t.AutoSize = $$true$\r$\n"
  FileWrite $R8 "$$uiFont = New-Object System.Drawing.Font('Segoe UI', 10.0, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)$\r$\n"
  FileWrite $R8 "$$g.Font = $$uiFont$\r$\n"
  FileWrite $R8 "$$a = New-Object System.Windows.Forms.Button$\r$\n"
  FileWrite $R8 "$$a.Text = 'Atualizar'$\r$\n"
  FileWrite $R8 "$$a.Location = New-Object System.Drawing.Point(16, 58)$\r$\n"
  FileWrite $R8 "$$a.Size = New-Object System.Drawing.Size(120, 28)$\r$\n"
  FileWrite $R8 "$$a.DialogResult = [System.Windows.Forms.DialogResult]::Yes$\r$\n"
  FileWrite $R8 "$$z = New-Object System.Windows.Forms.Button$\r$\n"
  FileWrite $R8 "$$z.Text = 'Cancelar'$\r$\n"
  FileWrite $R8 "$$z.Location = New-Object System.Drawing.Point(220, 58)$\r$\n"
  FileWrite $R8 "$$z.Size = New-Object System.Drawing.Size(120, 28)$\r$\n"
  FileWrite $R8 "$$z.DialogResult = [System.Windows.Forms.DialogResult]::No$\r$\n"
  FileWrite $R8 "$$g.Controls.AddRange(@($$t, $$a, $$z))$\r$\n"
  FileWrite $R8 "$$g.AcceptButton = $$a$\r$\n"
  FileWrite $R8 "$$g.CancelButton = $$z$\r$\n"
  FileWrite $R8 "$$r = $$g.ShowDialog()$\r$\n"
  FileWrite $R8 "if ($$r -eq [System.Windows.Forms.DialogResult]::Yes) { [Environment]::Exit(6) }$\r$\n"
  FileWrite $R8 "[Environment]::Exit(7)$\r$\n"
  FileClose $R8

  ClearErrors
  ExecWait 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "$TEMP\TudoCerto_update_ui.ps1"' $R9
  Delete /REBOOTOK "$TEMP\TudoCerto_update_ui.ps1"

  IntCmp $R9 6 tcPU_do_upd tcPU_quit tcPU_quit
  tcPU_do_upd:
  Call tcRunAllUninstalls
  Goto tcPU_out

  tcPU_err_open:
  MessageBox MB_OK|MB_ICONSTOP "Nao foi possivel preparar o assistente de atualizacao."
  Quit

  tcPU_quit:
  Quit

  tcPU_out:
FunctionEnd

!macro customInit
  Call tcDetectPrevious
  IfSilent tcInitSilent
  StrCmp $tcHasPrev "1" 0 tcInitDone
  Call tcPromptUpdateAfterUac
  Goto tcInitDone
  tcInitSilent:
  StrCmp $tcHasPrev "1" 0 tcInitDone
  Call tcRunAllUninstalls
  tcInitDone:
!macroend

!macro customCheckAppRunning
  IfSilent _tcSilentKills _tcInteractiveKills
  _tcSilentKills:
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM "${PRODUCT_FILENAME}.exe" /T >nul 2>&1 & exit /b 0'
  Sleep 1500
  Goto _tcProcDead

  _tcInteractiveKills:
  StrCpy $R4 0
  _tcKillLoop:
  IntOp $R4 $R4 + 1
  nsExec::ExecToLog 'cmd.exe /c taskkill /F /IM "${PRODUCT_FILENAME}.exe" /T >nul 2>&1 & exit /b 0'
  Sleep 1200
  !insertmacro FIND_PROCESS "${PRODUCT_FILENAME}.exe" $R0
  StrCmp $R0 0 _tcStillRunning _tcProcDead
  _tcStillRunning:
  IntCmp $R4 6 0 0 _tcKillLoop
  MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Feche o Tudo Certo e clique em Repetir." /SD IDCANCEL IDRETRY _tcRetryKill IDCANCEL _tcAbortInst
  _tcAbortInst:
  Quit
  _tcRetryKill:
  StrCpy $R4 0
  Goto _tcKillLoop
  _tcProcDead:
!macroend

Function tcInstallerBringToFront
  System::Call 'user32::ShowWindow(i $HWNDPARENT i 9)'
  System::Call 'user32::SetForegroundWindow(i $HWNDPARENT)'
FunctionEnd

!endif
