#!/bin/bash

# Open a new terminal window and run the first command
/bin/sh -ec 'cd server && yarn dev &'

# Open another new terminal window and run the second command
/bin/sh -ec 'cd client && yarn dev'

