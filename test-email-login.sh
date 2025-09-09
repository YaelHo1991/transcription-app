#!/bin/bash

# Test login with ayelho user via email
curl -X POST https://ylbh.co.il/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ayelho@gmail.com", "password": "0i!0B5ui1!"}' \
  -w "\nHTTP Status: %{http_code}\n"