<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>רכישת רישיונות - מערכת תמלול</title>
    <link rel="stylesheet" href="../assets/css/main.css?v=<?php echo time(); ?>">
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #fbcbc3 0%, #e1558b 30%, #be1558 70%, #322514 100%);
            min-height: 100vh;
            line-height: 1.6;
            position: relative;
            overflow-x: hidden;
        }

        /* Floating particles animation */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(circle at 40% 60%, rgba(255,255,255,0.06) 0%, transparent 50%);
            animation: float 25s infinite ease-in-out;
            z-index: -1;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        /* Glowing dots */
        body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px),
                radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px);
            background-size: 80px 80px, 120px 120px;
            background-position: 0 0, 40px 40px;
            animation: sparkle 15s linear infinite;
            z-index: -1;
        }

        @keyframes sparkle {
            0% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
            100% { opacity: 0.3; transform: scale(1); }
        }

        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.3);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            padding: 0 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 70px;
        }

        .logo h1 {
            color: #322514;
            font-size: 1.4em;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .nav-links a {
            color: #2c3e50;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 20px;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .nav-links a:hover {
            background: #667eea;
            color: white;
        }

        .main-container {
            width: 100%;
            min-height: 100vh;
            margin: 0;
            padding: 100px 20px 40px;
            max-width: none;
        }

        .hero-section {
            text-align: center;
            padding: 80px 0;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(25px);
            border-radius: 30px;
            margin-bottom: 50px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            position: relative;
            overflow: hidden;
        }

        .hero-section::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(from 0deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.1));
            animation: rotate 20s linear infinite;
            z-index: -1;
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .hero-section h1 {
            font-size: 3.5em;
            color: white;
            margin-bottom: 20px;
            font-weight: 800;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
            animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
            from { text-shadow: 3px 3px 6px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.3); }
            to { text-shadow: 3px 3px 6px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.5); }
        }

        .hero-section p {
            font-size: 1.4em;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 40px;
            font-weight: 400;
        }

        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 25px;
            margin: 40px 0;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.9);
            padding: 35px;
            border-radius: 20px;
            text-align: center;
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.4);
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s ease;
        }

        .stat-card:hover::before {
            left: 100%;
        }

        .stat-card:hover {
            transform: translateY(-10px) scale(1.05);
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }

        .stat-number {
            font-size: 3em;
            font-weight: 800;
            color: #be1558;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .stat-label {
            color: #322514;
            font-weight: 600;
            font-size: 1.1em;
        }

        .purchase-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 50px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            margin-top: 50px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .purchase-section h2 {
            color: #322514;
            font-size: 2.8em;
            margin-bottom: 40px;
            text-align: center;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }

        .user-details-section {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 40px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .user-details-section.crm-themed {
            background: linear-gradient(135deg, #fbcbc3 0%, #f8e8e5 100%);
            border-color: #be1558;
        }

        .user-details-section h4 {
            color: #322514;
            margin-bottom: 25px;
            font-size: 1.5em;
            font-weight: 700;
            text-align: center;
        }

        .user-details-section.crm-themed h4 {
            color: #be1558;
        }

        .user-details-section.crm-themed input {
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(190, 21, 88, 0.3);
            color: #322514;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .user-details-section.crm-themed input:focus {
            border-color: #be1558;
            box-shadow: 0 0 0 3px rgba(190, 21, 88, 0.1);
        }

        .user-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 25px;
        }

        .systems-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        .system-cube {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 25px;
            padding: 0;
            border: 3px solid transparent;
            transition: all 0.5s ease;
            overflow: hidden;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .system-cube::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }

        .system-cube:hover::before {
            transform: translateX(100%);
        }

        .system-cube:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        .system-header {
            padding: 30px;
            text-align: center;
            color: white;
            position: relative;
            z-index: 1;
        }

        .system-header h3 {
            font-size: 1.6em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .system-header p {
            font-size: 1em;
            opacity: 0.95;
            font-weight: 400;
        }

        .system-content {
            padding: 30px;
            background: rgba(255, 255, 255, 0.95);
            position: relative;
            z-index: 1;
        }

        .system-messages {
            margin-top: 20px;
            padding: 0 30px 30px;
            position: relative;
            z-index: 1;
        }

        /* CRM System - Pink Theme */
        .crm-system {
            border-color: #be1558;
        }

        .crm-system .system-header {
            background: linear-gradient(135deg, #be1558 0%, #e1558b 50%, #fbcbc3 100%);
            position: relative;
        }

        .crm-system .system-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.1));
            animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
        }

        .crm-system .system-content {
            background: linear-gradient(135deg, #fbcbc3 0%, #f8e8e5 100%);
        }

        .crm-system .permission-item input:checked + label {
            background: linear-gradient(135deg, rgba(190, 21, 88, 0.1) 0%, rgba(225, 85, 139, 0.1) 100%);
            border-color: #be1558;
            color: #be1558;
            box-shadow: 0 5px 15px rgba(190, 21, 88, 0.3);
        }

        /* Transcription System - Brown Theme */
        .transcription-system {
            border-color: #322514;
        }

        .transcription-system .system-header {
            background: linear-gradient(135deg, #322514 0%, #5a3f2a 50%, #8b6f47 100%);
            position: relative;
        }

        .transcription-system .system-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.1));
            animation: shimmer 3s ease-in-out infinite reverse;
        }

        .transcription-system .system-content {
            background: linear-gradient(135deg, #f5f0e8 0%, #e8dcc6 100%);
        }

        .transcription-system .permission-item input:checked + label {
            background: linear-gradient(135deg, rgba(50, 37, 20, 0.1) 0%, rgba(90, 63, 42, 0.1) 100%);
            border-color: #322514;
            color: #322514;
            box-shadow: 0 5px 15px rgba(50, 37, 20, 0.3);
        }

        .permission-item {
            display: flex;
            align-items: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 15px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
        }

        .permission-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
            transition: left 0.5s ease;
        }

        .permission-item:hover::before {
            left: 100%;
        }

        .permission-item:hover {
            background: rgba(255, 255, 255, 0.95);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .permission-item input {
            margin-left: 15px;
            transform: scale(1.3);
        }

        .permission-item label {
            margin: 0;
            cursor: pointer;
            font-weight: 600;
            color: #322514;
            font-size: 1.1em;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 10px;
            color: #322514;
            font-weight: 600;
            font-size: 1.1em;
        }

        .form-group input {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid #e0e0e0;
            border-radius: 15px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .form-group input:focus {
            outline: none;
            border-color: #be1558;
            box-shadow: 0 0 0 3px rgba(190, 21, 88, 0.1);
            transform: translateY(-2px);
        }

        .permissions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }

        .permission-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #e0e0e0;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .permission-card:hover {
            border-color: #667eea;
            transform: translateY(-2px);
        }

        .permission-card.selected {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
        }

        .permission-card h5 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .permission-card p {
            color: #6c757d;
            font-size: 0.9em;
            margin-bottom: 15px;
        }

        .permission-price {
            font-size: 1.4em;
            font-weight: 700;
            color: #28a745;
        }

        /* Old checkbox styles removed - using new permission-item styles */

        .company-section {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 20px;
            margin-top: 25px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .company-section.crm-themed {
            background: linear-gradient(135deg, #fbcbc3 0%, #f8e8e5 100%);
            border-color: #be1558;
        }

        .company-section h4 {
            color: #be1558;
            margin-bottom: 25px;
            text-align: center;
            font-size: 1.4em;
            font-weight: 700;
        }

        .company-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }

        .company-section input, .company-section select {
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(190, 21, 88, 0.3);
            color: #322514;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .company-section input:focus, .company-section select:focus {
            border-color: #be1558;
            box-shadow: 0 0 0 3px rgba(190, 21, 88, 0.1);
        }

        .pricing-summary {
            background: linear-gradient(135deg, #be1558 0%, #e1558b 50%, #fbcbc3 100%);
            color: white;
            padding: 40px;
            border-radius: 20px;
            margin: 40px 0;
            text-align: center;
            box-shadow: 0 10px 30px rgba(190, 21, 88, 0.3);
            position: relative;
            overflow: hidden;
        }

        .pricing-summary::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.1));
            animation: wave 4s ease-in-out infinite;
        }

        @keyframes wave {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
        }

        .pricing-summary h3 {
            grid-column: 1 / -1;
            margin-bottom: 30px;
            font-size: 2em;
            font-weight: 700;
            position: relative;
            z-index: 1;
        }

        .crm-pricing, .transcription-pricing {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }

        .section-price {
            font-size: 2em;
            font-weight: 700;
            margin: 10px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .total-price {
            font-size: 4em;
            font-weight: 900;
            margin: 20px 0;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
            position: relative;
            z-index: 1;
        }

        .price-breakdown {
            text-align: center;
            margin-top: 20px;
            font-size: 1.2em;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }

        .btn-primary {
            background: linear-gradient(135deg, #be1558 0%, #e1558b 50%, #fbcbc3 100%);
            color: white;
            border: none;
            padding: 20px 50px;
            font-size: 1.3em;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.4s ease;
            font-weight: 700;
            box-shadow: 0 8px 25px rgba(190, 21, 88, 0.4);
            position: relative;
            overflow: hidden;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s ease;
        }

        .btn-primary:hover::before {
            left: 100%;
        }

        .btn-primary:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 15px 40px rgba(190, 21, 88, 0.6);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .message {
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            font-weight: 600;
            font-size: 1.1em;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .message.success {
            background: rgba(40, 167, 69, 0.1);
            border: 2px solid #28a745;
            color: #155724;
        }

        .message.error {
            background: rgba(220, 53, 69, 0.1);
            border: 2px solid #dc3545;
            color: #721c24;
        }

        .message.success.crm-themed {
            background: linear-gradient(135deg, #fbcbc3 0%, #f8e8e5 100%);
            border: 2px solid #be1558;
            color: #be1558;
        }

        .message.success.transcription-themed {
            background: linear-gradient(135deg, #f5f0e8 0%, #e8dcc6 100%);
            border: 2px solid #322514;
            color: #322514;
        }

        .system-total {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 10px;
            text-align: center;
            font-size: 1.1em;
            color: #2c3e50;
            border: 2px solid rgba(0, 0, 0, 0.1);
        }

        .crm-system .system-total {
            background: rgba(190, 21, 88, 0.1);
            border-color: #be1558;
            color: #be1558;
        }

        .transcription-system .system-total {
            background: rgba(50, 37, 20, 0.1);
            border-color: #322514;
            color: #322514;
        }

        .loading {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(15px);
            z-index: 2000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .loading.show {
            display: block;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #be1558;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 25px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .systems-grid {
                grid-template-columns: 1fr;
            }
            
            .user-form-grid {
                grid-template-columns: 1fr;
            }
            
            .company-form-grid {
                grid-template-columns: 1fr;
            }
            
            .hero-section h1 {
                font-size: 2.2em;
            }
            
            .stats-cards {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">
                <h1>🎯 מערכת תמלול - רכישת רישיונות</h1>
            </div>
            <div class="nav-links">
                <!-- Main page link removed as requested -->
            </div>
        </div>
    </div>

    <div class="main-container">
        <div class="hero-section">
            <h1>🚀 הצטרפו למערכת התמלול המתקדמת</h1>
            <p>פתרון מקצועי לתמלול, ניהול לקוחות ועיבוד אודיו</p>
            
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-number" id="stat-total-users">50+</div>
                    <div class="stat-label">משתמשים פעילים</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-companies">15+</div>
                    <div class="stat-label">חברות לקוחות</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-transcribers">30+</div>
                    <div class="stat-label">מתמללים מקצועיים</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-projects">200+</div>
                    <div class="stat-label">פרויקטים הושלמו</div>
                </div>
            </div>
        </div>

        <div class="purchase-section">
            <h2>💼 רכישת רישיון</h2>
            
            <form id="purchase-form">
                <!-- User Details Section -->
                <div class="user-details-section crm-themed">
                    <h4>📋 פרטים אישיים</h4>
                    <div class="user-form-grid">
                        <div class="form-group">
                            <label for="full-name">שם מלא *</label>
                            <input type="text" id="full-name" name="fullName" required>
                        </div>
                        <div class="form-group">
                            <label for="email">אימייל *</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="is-admin">מנהל מערכת (אופציונלי)</label>
                            <input type="checkbox" id="is-admin" name="isAdmin" value="1">
                        </div>
                    </div>
                </div>

                <!-- Systems Grid -->
                <div class="systems-grid">
                    <!-- CRM System -->
                    <div class="system-cube crm-system">
                        <div class="system-header">
                            <h3>💼 מערכת CRM</h3>
                            <p>ניהול לקוחות ופרויקטים</p>
                        </div>
                        <div class="system-content">
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="A" id="perm-a">
                                <label for="perm-a">ניהול לקוחות (₪99/חודש)</label>
                            </div>
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="B" id="perm-b">
                                <label for="perm-b">ניהול עבודות (₪99/חודש)</label>
                            </div>
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="C" id="perm-c">
                                <label for="perm-c">ניהול מתמללים (₪99/חודש)</label>
                            </div>
                            <div class="system-total">
                                <strong>סך הכל CRM: <span id="crm-system-total">₪0</span></strong>
                            </div>
                        </div>
                        <div class="system-messages" id="crm-messages"></div>
                    </div>

                    <!-- Transcription App System -->
                    <div class="system-cube transcription-system">
                        <div class="system-header">
                            <h3>🎯 אפליקציית תמלול</h3>
                            <p>כלים לתמלול ועיבוד אודיו</p>
                        </div>
                        <div class="system-content">
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="D" id="perm-d">
                                <label for="perm-d">תמלול (₪79/חודש)</label>
                            </div>
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="E" id="perm-e">
                                <label for="perm-e">הגהה (₪79/חודש)</label>
                            </div>
                            <div class="permission-item">
                                <input type="checkbox" name="permissions" value="F" id="perm-f">
                                <label for="perm-f">ייצוא (₪79/חודש)</label>
                            </div>
                            <div class="system-total">
                                <strong>סך הכל תמלול: <span id="transcription-system-total">₪0</span></strong>
                            </div>
                        </div>
                        <div class="system-messages" id="transcription-messages"></div>
                    </div>
                </div>

                <!-- Company Section (CRM Only) -->
                <div class="company-section crm-themed">
                    <h4>🏢 חברה (אופציונלי - למערכת CRM בלבד)</h4>
                    <div class="company-form-grid">
                        <div class="form-group">
                            <label for="company-name">שם חברה חדשה</label>
                            <input type="text" id="company-name" name="companyName">
                        </div>
                        <div class="form-group" id="existing-companies" style="display: none;">
                            <label for="parent-company">או הצטרפות לחברה קיימת</label>
                            <select id="parent-company" name="parentCompanyId">
                                <option value="">בחר חברה קיימת</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="pricing-summary">
                    <div class="total-price" id="total-price">₪0</div>
                    <div class="price-breakdown" id="price-breakdown">
                        <p>בחרו הרשאות לחישוב מחיר</p>
                    </div>
                </div>

                <div style="text-align: center;">
                    <button type="submit" class="btn-primary">
                        🛒 רכישת רישיון
                    </button>
                </div>
            </form>
        </div>
    </div>

    <div class="loading" id="loading">
        <div class="spinner"></div>
        <p>מעבד רכישה...</p>
    </div>

    <div id="message-container"></div>

    <script src="../assets/js/app.js"></script>
    <script src="assets/js/selling.js"></script>
</body>
</html>