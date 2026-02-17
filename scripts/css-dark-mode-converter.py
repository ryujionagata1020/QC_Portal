#!/usr/bin/env python3
"""
CSS Dark Mode Variable Converter
Converts all color values in index.css to CSS variables for dark mode support
"""

import re
import sys

# Comprehensive color mapping
COLOR_MAP = {
    # Base colors - Background
    '#fafafa': 'var(--color-bg-body)',
    '#fff': 'var(--color-bg-container)',
    '#ffffff': 'var(--color-bg-container)',
    '#f9f9f9': 'var(--color-bg-container-alt)',
    '#f8f8f8': 'var(--color-bg-section)',

    # Text colors
    '#333': 'var(--color-text-primary)',
    '#333333': 'var(--color-text-primary)',
    '#555': 'var(--color-text-secondary)',
    '#555555': 'var(--color-text-secondary)',
    '#666': 'var(--color-text-tertiary)',
    '#666666': 'var(--color-text-tertiary)',
    '#888': 'var(--color-text-muted)',
    '#888888': 'var(--color-text-muted)',
    '#999': 'var(--color-text-light)',
    '#999999': 'var(--color-text-light)',
    '#777': 'var(--color-gray-700)',
    '#777777': 'var(--color-gray-700)',

    # Brand color (purple)
    '#8b6ccf': 'var(--color-brand)',
    '#a48cef': 'var(--color-brand-light)',
    '#b49cf5': 'var(--color-brand-lighter)',
    '#7a5bb8': 'var(--color-brand-dark)',
    '#7a5bbf': 'var(--color-brand-dark)',
    '#7a5cb8': 'var(--color-brand-dark)',
    '#7c5cbf': 'var(--color-brand-dark)',
    '#6b4cc0': 'var(--color-brand-darker)',
    '#f5f0ff': 'var(--color-brand-pale)',
    '#f8f6ff': 'var(--color-brand-pale-alt)',
    '#f8f5ff': 'var(--color-brand-pale-alt)',
    '#f3eeff': 'var(--color-brand-pale-alt)',
    '#ece4ff': 'var(--color-brand-pale-lighter)',
    '#e8c8ff': 'var(--color-brand-pale-lighter)',
    '#d4c4f5': 'var(--color-brand-border)',
    '#d6c8f0': 'var(--color-brand-border)',
    '#d0c8e0': 'var(--color-brand-border-alt)',
    '#e0d8f0': 'var(--color-brand-bg)',
    '#e8e0f4': 'var(--color-brand-bg)',
    '#c8b4f0': 'var(--color-brand-lighter)',
    '#9c80ff': 'var(--color-brand-bright)',

    # Purple variations for specific components
    '#5a4a8a': 'var(--color-purple-dark)',
    '#5a4a9e': 'var(--color-purple-dark)',
    '#6a5a8a': 'var(--color-purple-dark)',
    '#3a2a6a': 'var(--color-purple-darker)',
    '#2a4a6a': 'var(--color-purple-darker)',
    '#f0e6ff': 'var(--color-purple-pale)',
    '#f0ecf7': 'var(--color-purple-pale)',
    '#f0ecfa': 'var(--color-purple-pale)',
    '#f0ecff': 'var(--color-purple-pale)',

    # Border colors
    '#ddd': 'var(--color-border)',
    '#dddddd': 'var(--color-border)',
    '#eee': 'var(--color-border-light)',
    '#eeeeee': 'var(--color-border-light)',
    '#e8e8e8': 'var(--color-border-lighter)',
    '#ececec': 'var(--color-border-lighter)',
    '#ccc': 'var(--color-border-dark)',
    '#cccccc': 'var(--color-border-dark)',
    '#aaa': 'var(--color-border-darker)',
    '#aaaaaa': 'var(--color-border-darker)',
    '#bbb': 'var(--color-gray-600)',
    '#bbbbbb': 'var(--color-gray-600)',
    '#d8d8d8': 'var(--color-border)',

    # Navbar/Footer
    '#2f2f2f': 'var(--color-nav-bg)',
    '#f2f2f2': 'var(--color-nav-text)',
    '#444': 'var(--color-nav-border)',
    '#444444': 'var(--color-nav-border)',
    '#e0e0e0': 'var(--color-nav-link)',
    '#2b2b2b': 'var(--color-footer-bg)',
    '#d0d0d0': 'var(--color-nav-link)',

    # Success colors (green)
    '#28a745': 'var(--color-success)',
    '#22c55e': 'var(--color-success-bright)',
    '#16a34a': 'var(--color-success-dark)',
    '#2e7d32': 'var(--color-success-darker)',
    '#218838': 'var(--color-success-darker)',
    '#155724': 'var(--color-success-darkest)',
    '#1a5e1a': 'var(--color-success-darkest)',
    '#4ca34b': 'var(--color-success-medium)',
    '#6abf69': 'var(--color-success-light)',
    '#81d880': 'var(--color-success-lighter)',
    '#86efac': 'var(--color-success-lighter)',
    '#f0fdf4': 'var(--color-success-pale)',
    '#dcfce7': 'var(--color-success-pale)',
    '#e8f5e9': 'var(--color-success-pale-alt)',
    '#eef8ee': 'var(--color-success-pale-alt)',
    '#c3e6cb': 'var(--color-success-pale-alt)',
    '#d4edda': 'var(--color-success-pale-alt)',
    '#a5d6a7': 'var(--color-success-pale-darker)',

    # Error colors (red)
    '#dc3545': 'var(--color-error)',
    '#ef4444': 'var(--color-error-bright)',
    '#dc2626': 'var(--color-error-dark)',
    '#c82333': 'var(--color-error-darker)',
    '#c62828': 'var(--color-error-darker)',
    '#6e1a1a': 'var(--color-error-darkest)',
    '#c45050': 'var(--color-error-medium)',
    '#e07070': 'var(--color-error-light)',
    '#f08a8a': 'var(--color-error-lighter)',
    '#fca5a5': 'var(--color-error-lighter)',
    '#fef2f2': 'var(--color-error-pale)',
    '#fee2e2': 'var(--color-error-pale-alt)',
    '#ffebee': 'var(--color-error-pale-alt)',
    '#ffeef0': 'var(--color-error-pale-alt)',
    '#fff0f0': 'var(--color-error-pale-lighter)',

    # Warning colors (orange/amber)
    '#e65100': 'var(--color-warning)',
    '#f59e0b': 'var(--color-warning-bright)',
    '#d97706': 'var(--color-warning-dark)',
    '#e67e22': 'var(--color-warning-medium)',
    '#ff9800': 'var(--color-warning-medium)',
    '#f5a623': 'var(--color-warning-light)',
    '#fcd34d': 'var(--color-warning-lighter)',
    '#fbe96c': 'var(--color-warning-lighter)',
    '#856404': 'var(--color-warning-darkest)',
    '#fff3cd': 'var(--color-warning-pale)',
    '#fef3c7': 'var(--color-warning-pale)',
    '#fffbeb': 'var(--color-warning-pale-alt)',
    '#fff3e0': 'var(--color-warning-pale-alt)',
    '#ffe0b2': 'var(--color-warning-pale-darker)',
    '#ffeeba': 'var(--color-warning-pale-darker)',
    '#fce4b0': 'var(--color-warning-pale-darker)',

    # Yellow/Gold colors
    '#5a5030': 'var(--color-yellow-dark)',
    '#6a5a3a': 'var(--color-yellow-medium)',
    '#6d5a00': 'var(--color-yellow-dark)',
    '#7a6a1a': 'var(--color-yellow-medium)',
    '#8a7a5a': 'var(--color-yellow-light)',
    '#d4b13a': 'var(--color-yellow)',
    '#e6c84a': 'var(--color-yellow-light)',
    '#e0c860': 'var(--color-yellow-lighter)',
    '#d0c8a8': 'var(--color-yellow-pale)',
    '#e8e0c8': 'var(--color-yellow-pale-alt)',
    '#f0ede4': 'var(--color-yellow-pale-lighter)',
    '#f8f6f0': 'var(--color-yellow-pale-lighter)',
    '#fdf8ec': 'var(--color-yellow-pale-lightest)',
    '#fffbe6': 'var(--color-yellow-pale-lightest)',
    '#fffbf0': 'var(--color-yellow-pale-lightest)',
    '#fffef8': 'var(--color-yellow-pale-lightest)',
    '#fff3e8': 'var(--color-yellow-pale-alt)',

    # Info colors (blue)
    '#2196F3': 'var(--color-info)',
    '#2196f3': 'var(--color-info)',
    '#1976d2': 'var(--color-info-dark)',
    '#0288d1': 'var(--color-info-dark)',
    '#01579b': 'var(--color-info-darker)',
    '#004085': 'var(--color-info-darkest)',
    '#2b6cb0': 'var(--color-info-medium)',
    '#2a6aaa': 'var(--color-info-medium)',
    '#4a6a8a': 'var(--color-info-medium)',
    '#5b8def': 'var(--color-info-light)',
    '#b3e5fc': 'var(--color-info-lighter)',
    '#b8daff': 'var(--color-info-lighter)',
    '#c8e0f8': 'var(--color-info-lighter)',
    '#e1f5fe': 'var(--color-info-pale)',
    '#e8f4fd': 'var(--color-info-pale)',
    '#f0f8ff': 'var(--color-info-pale-alt)',
    '#cce5ff': 'var(--color-info-pale-alt)',
    '#f0f4f8': 'var(--color-info-pale-lighter)',

    # Dark colors
    '#1a1a2e': 'var(--color-dark)',
    '#16213e': 'var(--color-dark)',
    '#000': 'var(--color-black)',

    # Gray scale
    '#f5f5f5': 'var(--color-gray-50)',
    '#f0f0f0': 'var(--color-gray-100)',
    '#e8e8e8': 'var(--color-gray-200)',
    '#e0e0e0': 'var(--color-gray-300)',
    '#d0d0d0': 'var(--color-gray-400)',
    '#ccc': 'var(--color-gray-500)',
    '#cccccc': 'var(--color-gray-500)',
    '#bbb': 'var(--color-gray-600)',
    '#bbbbbb': 'var(--color-gray-600)',
    '#777': 'var(--color-gray-700)',
    '#777777': 'var(--color-gray-700)',
    '#666': 'var(--color-gray-800)',
    '#666666': 'var(--color-gray-800)',
    '#6c757d': 'var(--color-gray-800)',
    '#5a6268': 'var(--color-gray-850)',
    '#444': 'var(--color-gray-900)',
    '#444444': 'var(--color-gray-900)',
    '#d1d5db': 'var(--color-gray-400)',
    '#e5e7eb': 'var(--color-gray-200)',

    # Special backgrounds
    '#f8f8fc': 'var(--color-bg-purple-tint)',
}

# RGBA color mappings - need to handle these separately
RGBA_PATTERNS = [
    # Black shadows
    (r'rgba\(0,\s*0,\s*0,\s*0\.05\)', 'rgba(0, 0, 0, 0.05)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.06\)', 'rgba(0, 0, 0, 0.06)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.08\)', 'rgba(0, 0, 0, 0.08)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.1\)', 'rgba(0, 0, 0, 0.1)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.2\)', 'rgba(0, 0, 0, 0.2)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.3\)', 'rgba(0, 0, 0, 0.3)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.5\)', 'rgba(0, 0, 0, 0.5)'),
    (r'rgba\(0,\s*0,\s*0,\s*0\.6\)', 'rgba(0, 0, 0, 0.6)'),

    # White overlays
    (r'rgba\(255,\s*255,\s*255,\s*0\.1\)', 'rgba(255, 255, 255, 0.1)'),
    (r'rgba\(255,\s*255,\s*255,\s*0\.2\)', 'rgba(255, 255, 255, 0.2)'),
    (r'rgba\(255,\s*255,\s*255,\s*0\.5\)', 'rgba(255, 255, 255, 0.5)'),
    (r'rgba\(255,\s*255,\s*255,\s*0\.95\)', 'rgba(255, 255, 255, 0.95)'),

    # Brand purple variations
    (r'rgba\(139,\s*108,\s*207,\s*0\.1\)', 'rgba(139, 108, 207, 0.1)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.15\)', 'rgba(139, 108, 207, 0.15)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.2\)', 'rgba(139, 108, 207, 0.2)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.25\)', 'rgba(139, 108, 207, 0.25)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.3\)', 'rgba(139, 108, 207, 0.3)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.35\)', 'rgba(139, 108, 207, 0.35)'),
    (r'rgba\(139,\s*108,\s*207,\s*0\.4\)', 'rgba(139, 108, 207, 0.4)'),

    # Success colors
    (r'rgba\(34,\s*197,\s*94,\s*0\.25\)', 'rgba(34, 197, 94, 0.25)'),
    (r'rgba\(34,\s*197,\s*94,\s*0\.35\)', 'rgba(34, 197, 94, 0.35)'),
    (r'rgba\(22,\s*163,\s*74,\s*0\.9\)', 'rgba(22, 163, 74, 0.9)'),
    (r'rgba\(144,\s*238,\s*144,\s*0\.15\)', 'rgba(144, 238, 144, 0.15)'),
    (r'rgba\(144,\s*238,\s*144,\s*0\.4\)', 'rgba(144, 238, 144, 0.4)'),
    (r'rgba\(0,\s*255,\s*0,\s*0\.4\)', 'rgba(0, 255, 0, 0.4)'),

    # Error colors
    (r'rgba\(239,\s*68,\s*68,\s*0\.15\)', 'rgba(239, 68, 68, 0.15)'),
    (r'rgba\(239,\s*68,\s*68,\s*0\.4\)', 'rgba(239, 68, 68, 0.4)'),
    (r'rgba\(239,\s*68,\s*68,\s*0\.6\)', 'rgba(239, 68, 68, 0.6)'),
    (r'rgba\(220,\s*38,\s*38,\s*0\.9\)', 'rgba(220, 38, 38, 0.9)'),
    (r'rgba\(255,\s*0,\s*0,\s*0\.5\)', 'rgba(255, 0, 0, 0.5)'),
    (r'rgba\(255,\s*100,\s*100,\s*0\.4\)', 'rgba(255, 100, 100, 0.4)'),
    (r'rgba\(255,\s*192,\s*203,\s*0\.15\)', 'rgba(255, 192, 203, 0.15)'),

    # Warning colors
    (r'rgba\(245,\s*158,\s*11,\s*0\.25\)', 'rgba(245, 158, 11, 0.25)'),
    (r'rgba\(245,\s*158,\s*11,\s*0\.35\)', 'rgba(245, 158, 11, 0.35)'),
    (r'rgba\(217,\s*119,\s*6,\s*0\.9\)', 'rgba(217, 119, 6, 0.9)'),
]

CSS_VARIABLES = """/* =========================================================
   CSS Variables for Light/Dark Theme Support
   ========================================================= */
:root {
  /* ============ Base Colors ============ */
  --color-bg-body: #fafafa;
  --color-bg-container: #fff;
  --color-bg-container-alt: #f9f9f9;
  --color-bg-section: #f8f8f8;
  --color-bg-modal: #fff;
  --color-bg-purple-tint: #f8f8fc;

  /* ============ Text Colors ============ */
  --color-text-primary: #333;
  --color-text-secondary: #555;
  --color-text-tertiary: #666;
  --color-text-muted: #888;
  --color-text-light: #999;
  --color-text-inverse: #fff;

  /* ============ Brand Color (Purple) ============ */
  --color-brand: #8b6ccf;
  --color-brand-light: #a48cef;
  --color-brand-lighter: #b49cf5;
  --color-brand-dark: #7a5bb8;
  --color-brand-darker: #6b4cc0;
  --color-brand-bright: #9c80ff;
  --color-brand-pale: #f5f0ff;
  --color-brand-pale-alt: #f8f6ff;
  --color-brand-pale-lighter: #ece4ff;
  --color-brand-border: #d4c4f5;
  --color-brand-border-alt: #d0c8e0;
  --color-brand-bg: #e0d8f0;

  /* ============ Purple Variations ============ */
  --color-purple-dark: #5a4a8a;
  --color-purple-darker: #3a2a6a;
  --color-purple-pale: #f0e6ff;

  /* ============ Border Colors ============ */
  --color-border: #ddd;
  --color-border-light: #eee;
  --color-border-lighter: #e8e8e8;
  --color-border-dark: #ccc;
  --color-border-darker: #aaa;

  /* ============ Navbar & Footer ============ */
  --color-nav-bg: #2f2f2f;
  --color-nav-text: #f2f2f2;
  --color-nav-border: #444;
  --color-nav-link: #e0e0e0;
  --color-nav-divider: #555;
  --color-footer-bg: #2b2b2b;
  --color-footer-text: #d0d0d0;

  /* ============ Success Colors (Green) ============ */
  --color-success: #28a745;
  --color-success-bright: #22c55e;
  --color-success-dark: #16a34a;
  --color-success-darker: #2e7d32;
  --color-success-darkest: #155724;
  --color-success-medium: #4ca34b;
  --color-success-light: #6abf69;
  --color-success-lighter: #81d880;
  --color-success-pale: #f0fdf4;
  --color-success-pale-alt: #e8f5e9;
  --color-success-pale-darker: #a5d6a7;

  /* ============ Error Colors (Red) ============ */
  --color-error: #dc3545;
  --color-error-bright: #ef4444;
  --color-error-dark: #dc2626;
  --color-error-darker: #c82333;
  --color-error-darkest: #6e1a1a;
  --color-error-medium: #c45050;
  --color-error-light: #e07070;
  --color-error-lighter: #f08a8a;
  --color-error-pale: #fef2f2;
  --color-error-pale-alt: #fee2e2;
  --color-error-pale-lighter: #fff0f0;

  /* ============ Warning Colors (Orange/Amber) ============ */
  --color-warning: #e65100;
  --color-warning-bright: #f59e0b;
  --color-warning-dark: #d97706;
  --color-warning-darkest: #856404;
  --color-warning-medium: #ff9800;
  --color-warning-light: #f5a623;
  --color-warning-lighter: #fcd34d;
  --color-warning-pale: #fff3cd;
  --color-warning-pale-alt: #fff3e0;
  --color-warning-pale-darker: #ffe0b2;

  /* ============ Yellow/Gold Colors ============ */
  --color-yellow: #d4b13a;
  --color-yellow-dark: #5a5030;
  --color-yellow-medium: #7a6a1a;
  --color-yellow-light: #e6c84a;
  --color-yellow-lighter: #e0c860;
  --color-yellow-pale: #d0c8a8;
  --color-yellow-pale-alt: #e8e0c8;
  --color-yellow-pale-lighter: #f0ede4;
  --color-yellow-pale-lightest: #fffbf0;

  /* ============ Info Colors (Blue) ============ */
  --color-info: #2196F3;
  --color-info-dark: #1976d2;
  --color-info-darker: #01579b;
  --color-info-darkest: #004085;
  --color-info-medium: #2b6cb0;
  --color-info-light: #5b8def;
  --color-info-lighter: #b3e5fc;
  --color-info-pale: #e1f5fe;
  --color-info-pale-alt: #cce5ff;
  --color-info-pale-lighter: #f0f4f8;

  /* ============ Neutral Colors ============ */
  --color-dark: #1a1a2e;
  --color-black: #000;

  /* ============ Gray Scale ============ */
  --color-gray-50: #f5f5f5;
  --color-gray-100: #f0f0f0;
  --color-gray-200: #e8e8e8;
  --color-gray-300: #e0e0e0;
  --color-gray-400: #d0d0d0;
  --color-gray-500: #ccc;
  --color-gray-600: #bbb;
  --color-gray-700: #777;
  --color-gray-800: #666;
  --color-gray-850: #5a6268;
  --color-gray-900: #444;
}

/* ============================================================
   Dark Theme Variables
   ============================================================ */
[data-theme="dark"] {
  /* ============ Base Colors ============ */
  --color-bg-body: #1a1a1a;
  --color-bg-container: #242424;
  --color-bg-container-alt: #2a2a2a;
  --color-bg-section: #202020;
  --color-bg-modal: #2a2a2a;
  --color-bg-purple-tint: #2a243a;

  /* ============ Text Colors ============ */
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #b8b8b8;
  --color-text-tertiary: #a0a0a0;
  --color-text-muted: #888;
  --color-text-light: #707070;
  --color-text-inverse: #000;

  /* ============ Brand Color (Purple) ============ */
  --color-brand: #a48cef;
  --color-brand-light: #b49cf5;
  --color-brand-lighter: #c8b4f0;
  --color-brand-dark: #8b6ccf;
  --color-brand-darker: #7a5bb8;
  --color-brand-bright: #b49cf5;
  --color-brand-pale: #2a243a;
  --color-brand-pale-alt: #30283f;
  --color-brand-pale-lighter: #35304a;
  --color-brand-border: #4a3a6a;
  --color-brand-border-alt: #3a3050;
  --color-brand-bg: #3a2a5a;

  /* ============ Purple Variations ============ */
  --color-purple-dark: #8b6ccf;
  --color-purple-darker: #7a5bb8;
  --color-purple-pale: #30283f;

  /* ============ Border Colors ============ */
  --color-border: #3a3a3a;
  --color-border-light: #303030;
  --color-border-lighter: #2c2c2c;
  --color-border-dark: #444;
  --color-border-darker: #555;

  /* ============ Navbar & Footer ============ */
  --color-nav-bg: #1a1a1a;
  --color-nav-text: #e0e0e0;
  --color-nav-border: #303030;
  --color-nav-link: #b8b8b8;
  --color-nav-divider: #3a3a3a;
  --color-footer-bg: #1a1a1a;
  --color-footer-text: #a0a0a0;

  /* ============ Success Colors (Green) ============ */
  --color-success: #22c55e;
  --color-success-bright: #4ade80;
  --color-success-dark: #16a34a;
  --color-success-darker: #15803d;
  --color-success-darkest: #14532d;
  --color-success-medium: #22c55e;
  --color-success-light: #4ade80;
  --color-success-lighter: #86efac;
  --color-success-pale: #1a3a2a;
  --color-success-pale-alt: #1e4a30;
  --color-success-pale-darker: #2a5a40;

  /* ============ Error Colors (Red) ============ */
  --color-error: #ef4444;
  --color-error-bright: #f87171;
  --color-error-dark: #dc2626;
  --color-error-darker: #b91c1c;
  --color-error-darkest: #7f1d1d;
  --color-error-medium: #ef4444;
  --color-error-light: #f87171;
  --color-error-lighter: #fca5a5;
  --color-error-pale: #3a1a1a;
  --color-error-pale-alt: #4a2020;
  --color-error-pale-lighter: #5a2828;

  /* ============ Warning Colors (Orange/Amber) ============ */
  --color-warning: #f59e0b;
  --color-warning-bright: #fbbf24;
  --color-warning-dark: #d97706;
  --color-warning-darkest: #78350f;
  --color-warning-medium: #f59e0b;
  --color-warning-light: #fbbf24;
  --color-warning-lighter: #fcd34d;
  --color-warning-pale: #3a2a1a;
  --color-warning-pale-alt: #4a3520;
  --color-warning-pale-darker: #5a4530;

  /* ============ Yellow/Gold Colors ============ */
  --color-yellow: #fbbf24;
  --color-yellow-dark: #a16207;
  --color-yellow-medium: #d97706;
  --color-yellow-light: #fbbf24;
  --color-yellow-lighter: #fcd34d;
  --color-yellow-pale: #3a3020;
  --color-yellow-pale-alt: #4a3a28;
  --color-yellow-pale-lighter: #5a4530;
  --color-yellow-pale-lightest: #6a5540;

  /* ============ Info Colors (Blue) ============ */
  --color-info: #3b82f6;
  --color-info-dark: #2563eb;
  --color-info-darker: #1e40af;
  --color-info-darkest: #1e3a8a;
  --color-info-medium: #3b82f6;
  --color-info-light: #60a5fa;
  --color-info-lighter: #93c5fd;
  --color-info-pale: #1a2a4a;
  --color-info-pale-alt: #1e3555;
  --color-info-pale-lighter: #254060;

  /* ============ Neutral Colors ============ */
  --color-dark: #e0e0e0;
  --color-black: #fff;

  /* ============ Gray Scale ============ */
  --color-gray-50: #303030;
  --color-gray-100: #363636;
  --color-gray-200: #3c3c3c;
  --color-gray-300: #424242;
  --color-gray-400: #4a4a4a;
  --color-gray-500: #555;
  --color-gray-600: #666;
  --color-gray-700: #888;
  --color-gray-800: #a0a0a0;
  --color-gray-850: #b0b0b0;
  --color-gray-900: #c0c0c0;
}

"""

def replace_colors_in_content(content):
    """Replace hex and rgba colors with CSS variables"""
    result = content
    replacements_made = 0

    # Sort by length (longest first) to avoid partial replacements
    sorted_colors = sorted(COLOR_MAP.items(), key=lambda x: len(x[0]), reverse=True)

    # Replace hex colors
    for hex_color, var_name in sorted_colors:
        # Case-insensitive replacement, preserve original case in output
        pattern = re.compile(re.escape(hex_color), re.IGNORECASE)
        count = len(pattern.findall(result))
        if count > 0:
            result = pattern.sub(var_name, result)
            replacements_made += count
            print(f"  Replaced {hex_color} -> {var_name} ({count} times)")

    # Note: RGBA colors are left as-is since they need context-specific handling
    # They will work fine in dark mode as opacity values

    return result, replacements_made

def main():
    input_file = 'c:/Users/3ksre/Documents/QC_Portal/public/index.css'

    try:
        print("Reading CSS file...")
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"Original file: {len(content)} characters, {content.count(chr(10))} lines")

        print("\nReplacing colors with CSS variables...")
        converted_content, replacements = replace_colors_in_content(content)

        print(f"\nTotal replacements made: {replacements}")

        # Add CSS variables at the beginning
        final_content = CSS_VARIABLES + converted_content

        print(f"Final file: {len(final_content)} characters, {final_content.count(chr(10))} lines")

        # Write the result
        with open(input_file, 'w', encoding='utf-8') as f:
            f.write(final_content)

        print(f"\n✓ Successfully updated {input_file}")
        print("Dark mode CSS variables have been added!")

    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
