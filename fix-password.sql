-- Fix password hashes for users
UPDATE users SET password = '$2b$10$cCpplDCgs3Z2OaRJF6EUu.Femx6xNVACCdHcV4D.QoMrMkNcca/re' WHERE username = 'ayelho';
UPDATE users SET password = '$2b$10$CH77dCLEaHiWG5gKHrLrau8WA75fuGSxl5g4cMlTzdnhUkaw0jimW' WHERE username = 'demo';