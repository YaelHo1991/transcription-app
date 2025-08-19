; AutoHotkey Script for Transcription System
; Makes END key move to end of line AND switch to Hebrew keyboard

; When END key is pressed:
End::
    ; First, send the normal END key to move cursor to end of line
    Send, {End}
    
    ; Small delay to ensure cursor moves first
    Sleep, 50
    
    ; Then switch keyboard language (Alt+Shift)
    Send, {LAlt down}{LShift down}{LShift up}{LAlt up}
    
    ; Optional: Show a tooltip to confirm
    ToolTip, Switched to Hebrew
    SetTimer, RemoveToolTip, 1000
return

; Remove tooltip after 1 second
RemoveToolTip:
    ToolTip
return

; Optional: Add Home key to switch to English
; Home::
;     Send, {Home}
;     Sleep, 50
;     Send, {LAlt down}{LShift down}{LShift up}{LAlt up}
;     ToolTip, Switched to English
;     SetTimer, RemoveToolTip, 1000
; return

; Optional: Use Ctrl+End to just move to end without switching
^End::
    Send, {End}
return

; Exit script with Ctrl+Alt+X (for testing)
^!x::ExitApp