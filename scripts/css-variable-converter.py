#!/usr/bin/env python3
"""
CSS Dark Mode Variable Converter
Converts all color values in index.css to CSS variables
"""

import re
import sys

# Color mapping dictionary: hex/rgba values -> CSS variable names
COLOR_MAP = {
    # ベースカラー
    '#fafafa': 'var(--color-bg-body)',
    '#fff': 'var(--color-bg-container)',
    '#ffffff': 'var(--color-bg-container)',
    '#f9f9f9': 'var(--color-bg-container-alt)',
    '#f8f8f8': 'var(--color-bg-section)',

    # テキスト
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

    # ブランドカラー (紫)
    '#8b6ccf': 'var(--color-brand)',
    '#a48cef': 'var(--color-brand-light)',
    '#b49cf5': 'var(--color-brand-lighter)',
    '#7a5bb8': 'var(--color-brand-dark)',
    '#f5f0ff': 'var(--color-brand-pale)',
    '#f8f6ff': 'var(--color-brand-pale-alt)',
    '#d4c4f5': 'var(--color-brand-border)',
    '#e0d8f0': 'var(--color-brand-bg)',

    # ボーダー
    '#ddd': 'var(--color-border)',
    '#dddddd': 'var(--color-border)',
    '#eee': 'var(--color-border-light)',
    '#eeeeee': 'var(--color-border-light)',
    '#e8e8e8': 'var(--color-border-lighter)',
    '#ccc': 'var(--color-border-dark)',
    '#cccccc': 'var(--color-border-dark)',
    '#aaa': 'var(--color-border-darker)',
    '#aaaaaa': 'var(--color-border-darker)',

    # ナビバー・フッター
    '#2f2f2f': 'var(--color-nav-bg)',
    '#f2f2f2': 'var(--color-nav-text)',
    '#444': 'var(--color-nav-border)',
    '#444444': 'var(--color-nav-border)',
    '#e0e0e0': 'var(--color-nav-link)',
    '#2b2b2b': 'var(--color-footer-bg)',
    '#d0d0d0': 'var(--color-nav-link)',

    # ステータスカラー
    '#28a745': 'var(--color-success)',
    '#f0fdf4': 'var(--color-success-bg)',
    '#dc3545': 'var(--color-error)',
    '#fef2f2': 'var(--color-error-bg)',
    '#e65100': 'var(--color-warning)',
    '#2196F3': 'var(--color-info)',
    '#2196f3': 'var(--color-info)',

    # グレースケール
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
    '#444': 'var(--color-gray-900)',
    '#444444': 'var(--color-gray-900)',
}

# RGBA color mapping
RGBA_MAP = {
    'rgba(0, 0, 0, 0.1)': 'var(--shadow-sm)',
    'rgba(0, 0, 0, 0.05)': 'var(--shadow-md)',
    'rgba(0, 0, 0, 0.3)': 'var(--shadow-lg)',
    'rgba(0,0,0,0.1)': 'var(--shadow-sm)',
    'rgba(0,0,0,0.05)': 'var(--shadow-md)',
    'rgba(0,0,0,0.3)': 'var(--shadow-lg)',
    'rgba(0, 0, 0, 0.2)': 'rgba(0, 0, 0, 0.2)',  # Keep as-is for specific cases
    'rgba(139, 108, 207, 0.3)': 'var(--shadow-brand)',
    'rgba(139,108,207,0.3)': 'var(--shadow-brand)',
}

CSS_VARIABLES = """/* =========================================================
   CSS Variables for Light/Dark Theme
   ========================================================= */
:root {
  /* ベースカラー */
  --color-bg-body: #fafafa;
  --color-bg-container: #fff;
  --color-bg-container-alt: #f9f9f9;
  --color-bg-section: #f8f8f8;
  --color-bg-modal: #fff;

  /* テキスト */
  --color-text-primary: #333;
  --color-text-secondary: #555;
  --color-text-tertiary: #666;
  --color-text-muted: #888;
  --color-text-light: #999;
  --color-text-inverse: #fff;

  /* ブランドカラー (紫) */
  --color-brand: #8b6ccf;
  --color-brand-light: #a48cef;
  --color-brand-lighter: #b49cf5;
  --color-brand-dark: #7a5bb8;
  --color-brand-pale: #f5f0ff;
  --color-brand-pale-alt: #f8f6ff;
  --color-brand-border: #d4c4f5;
  --color-brand-bg: #e0d8f0;

  /* ボーダー */
  --color-border: #ddd;
  --color-border-light: #eee;
  --color-border-lighter: #e8e8e8;
  --color-border-dark: #ccc;
  --color-border-darker: #aaa;

  /* ナビバー・フッター */
  --color-nav-bg: #2f2f2f;
  --color-nav-text: #f2f2f2;
  --color-nav-border: #444;
  --color-nav-link: #e0e0e0;
  --color-nav-divider: #555;
  --color-footer-bg: #2b2b2b;
  --color-footer-text: #d0d0d0;

  /* ステータスカラー */
  --color-success: #28a745;
  --color-success-bg: #f0fdf4;
  --color-error: #dc3545;
  --color-error-bg: #fef2f2;
  --color-warning: #e65100;
  --color-info: #2196F3;

  /* シャドウ */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.3);
  --shadow-brand: 0 4px 15px rgba(139, 108, 207, 0.3);

  /* グレースケール */
  --color-gray-50: #f5f5f5;
  --color-gray-100: #f0f0f0;
  --color-gray-200: #e8e8e8;
  --color-gray-300: #e0e0e0;
  --color-gray-400: #d0d0d0;
  --color-gray-500: #ccc;
  --color-gray-600: #bbb;
  --color-gray-700: #777;
  --color-gray-800: #666;
  --color-gray-900: #444;
}

[data-theme="dark"] {
  /* ベースカラー */
  --color-bg-body: #1a1a1a;
  --color-bg-container: #242424;
  --color-bg-container-alt: #2a2a2a;
  --color-bg-section: #202020;
  --color-bg-modal: #2a2a2a;

  /* テキスト */
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #b8b8b8;
  --color-text-tertiary: #a0a0a0;
  --color-text-muted: #888;
  --color-text-light: #707070;
  --color-text-inverse: #000;

  /* ブランドカラー (紫) */
  --color-brand: #a48cef;
  --color-brand-light: #b49cf5;
  --color-brand-lighter: #c8b4f0;
  --color-brand-dark: #8b6ccf;
  --color-brand-pale: #2a243a;
  --color-brand-pale-alt: #30283f;
  --color-brand-border: #4a3a6a;
  --color-brand-bg: #3a2a5a;

  /* ボーダー */
  --color-border: #3a3a3a;
  --color-border-light: #303030;
  --color-border-lighter: #2c2c2c;
  --color-border-dark: #444;
  --color-border-darker: #555;

  /* ナビバー・フッター */
  --color-nav-bg: #1a1a1a;
  --color-nav-text: #e0e0e0;
  --color-nav-border: #303030;
  --color-nav-link: #b8b8b8;
  --color-nav-divider: #3a3a3a;
  --color-footer-bg: #1a1a1a;
  --color-footer-text: #a0a0a0;

  /* ステータスカラー */
  --color-success: #22c55e;
  --color-success-bg: #1a3a2a;
  --color-error: #ef4444;
  --color-error-bg: #3a1a1a;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* シャドウ */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.8);
  --shadow-brand: 0 4px 15px rgba(164, 140, 239, 0.3);

  /* グレースケール */
  --color-gray-50: #303030;
  --color-gray-100: #363636;
  --color-gray-200: #3c3c3c;
  --color-gray-300: #424242;
  --color-gray-400: #4a4a4a;
  --color-gray-500: #555;
  --color-gray-600: #666;
  --color-gray-700: #888;
  --color-gray-800: #a0a0a0;
  --color-gray-900: #c0c0c0;
}

"""

def replace_colors(content):
    """Replace color values with CSS variables"""
    result = content

    # Replace hex colors (case-insensitive)
    for hex_color, var_name in COLOR_MAP.items():
        # Match the hex color (case-insensitive) followed by semicolon or space
        pattern = re.compile(re.escape(hex_color), re.IGNORECASE)
        result = pattern.sub(var_name, result)

    # Replace rgba colors
    for rgba_color, var_name in RGBA_MAP.items():
        # Match exact rgba values
        pattern = re.compile(re.escape(rgba_color), re.IGNORECASE)
        result = pattern.sub(var_name, result)

    return result

def main():
    input_file = 'c:/Users/3ksre/Documents/QC_Portal/public/index.css'
    output_file = 'c:/Users/3ksre/Documents/QC_Portal/public/index.css'

    try:
        # Read the original CSS file
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"Original file size: {len(content)} characters")

        # Replace colors with variables
        converted_content = replace_colors(content)

        # Add CSS variables at the beginning
        final_content = CSS_VARIABLES + '\n' + converted_content

        print(f"Converted file size: {len(final_content)} characters")

        # Write the converted CSS file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_content)

        print(f"Successfully converted {input_file} to use CSS variables")
        print(f"Output written to {output_file}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
