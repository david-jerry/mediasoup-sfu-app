# Open a new terminal window and run the first command
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd server && yarn dev" -NoNewWindow

# Open another new terminal window and run the second command
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd client && yarn dev" -NoNewWindow
