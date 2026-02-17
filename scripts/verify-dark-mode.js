#!/usr/bin/env node
/**
 * Dark Mode Implementation Verification Script
 *
 * このスクリプトはダークモード実装が正しく行われているかを検証します。
 */

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../public/index.css');
const navbarPath = path.join(__dirname, '../views/_share/navbar.ejs');

console.log('='.repeat(60));
console.log('Dark Mode Implementation Verification');
console.log('='.repeat(60));

// 1. CSS変数の定義を確認
console.log('\n1. Checking CSS Variables Definition...');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

const hasRootVars = cssContent.includes(':root {');
const hasDarkThemeVars = cssContent.includes('[data-theme="dark"]');
const varCount = (cssContent.match(/var\(--[a-z0-9-]+\)/g) || []).length;

console.log(`   ✓ :root selector found: ${hasRootVars}`);
console.log(`   ✓ [data-theme="dark"] selector found: ${hasDarkThemeVars}`);
console.log(`   ✓ CSS variable usages: ${varCount}`);

// 2. 重要な変数の存在確認
console.log('\n2. Checking Critical CSS Variables...');
const criticalVars = [
  '--color-bg-body',
  '--color-text-primary',
  '--color-brand',
  '--color-success',
  '--color-error',
  '--color-nav-bg',
  '--color-border'
];

criticalVars.forEach(varName => {
  const regex = new RegExp(`${varName}:\\s*#[0-9a-fA-F]{3,6}`);
  const found = regex.test(cssContent);
  console.log(`   ${found ? '✓' : '✗'} ${varName}: ${found ? 'defined' : 'MISSING'}`);
});

// 3. ナビバーのテーマボタンを確認
console.log('\n3. Checking Theme Toggle Button in Navbar...');
const navbarContent = fs.readFileSync(navbarPath, 'utf-8');

const hasThemeButton = navbarContent.includes('class="theme-toggle-btn"');
const hasToggleThemeFunction = navbarContent.includes('function toggleTheme()');
const hasInitThemeFunction = navbarContent.includes('function initTheme()');
const hasThemeIcon = navbarContent.includes('class="theme-icon"');

console.log(`   ${hasThemeButton ? '✓' : '✗'} Theme toggle button: ${hasThemeButton ? 'found' : 'MISSING'}`);
console.log(`   ${hasToggleThemeFunction ? '✓' : '✗'} toggleTheme() function: ${hasToggleThemeFunction ? 'found' : 'MISSING'}`);
console.log(`   ${hasInitThemeFunction ? '✓' : '✗'} initTheme() function: ${hasInitThemeFunction ? 'found' : 'MISSING'}`);
console.log(`   ${hasThemeIcon ? '✓' : '✓'} Theme icon element: ${hasThemeIcon ? 'found' : 'MISSING'}`);

// 4. テーマボタンのスタイル確認
console.log('\n4. Checking Theme Button Styles...');
const hasThemeButtonStyle = cssContent.includes('.theme-toggle-btn {');
const hasThemeIconStyle = cssContent.includes('.theme-icon {');

console.log(`   ${hasThemeButtonStyle ? '✓' : '✗'} .theme-toggle-btn style: ${hasThemeButtonStyle ? 'found' : 'MISSING'}`);
console.log(`   ${hasThemeIconStyle ? '✓' : '✗'} .theme-icon style: ${hasThemeIconStyle ? 'found' : 'MISSING'}`);

// 5. レスポンシブスタイル確認
console.log('\n5. Checking Responsive Styles...');
const hasResponsiveThemeButton = cssContent.includes('.theme-toggle-btn {') &&
                                  cssContent.includes('@media screen and (max-width: 768px)');

console.log(`   ${hasResponsiveThemeButton ? '✓' : '✗'} Responsive theme button: ${hasResponsiveThemeButton ? 'found' : 'MISSING'}`);

// 6. localStorage使用の確認
console.log('\n6. Checking localStorage Integration...');
const usesLocalStorage = navbarContent.includes('localStorage.getItem') &&
                         navbarContent.includes('localStorage.setItem');

console.log(`   ${usesLocalStorage ? '✓' : '✗'} localStorage usage: ${usesLocalStorage ? 'found' : 'MISSING'}`);

// 7. 統計情報
console.log('\n' + '='.repeat(60));
console.log('Statistics:');
console.log('='.repeat(60));

const cssLines = cssContent.split('\n').length;
const rootStart = cssContent.indexOf(':root {');
const darkThemeStart = cssContent.indexOf('[data-theme="dark"]');
const rootEnd = cssContent.indexOf('}', rootStart);
const darkThemeEnd = cssContent.indexOf('}', cssContent.indexOf('}', darkThemeStart) + 1);

const rootVarsCount = (cssContent.substring(rootStart, rootEnd).match(/--[a-z0-9-]+:/g) || []).length;
const darkVarsCount = (cssContent.substring(darkThemeStart, darkThemeEnd).match(/--[a-z0-9-]+:/g) || []).length;

console.log(`Total CSS lines: ${cssLines}`);
console.log(`Total CSS variable usages: ${varCount}`);
console.log(`Variables defined in :root: ${rootVarsCount}`);
console.log(`Variables defined in [data-theme="dark"]: ${darkVarsCount}`);

// 8. 最終判定
console.log('\n' + '='.repeat(60));
const allChecks = [
  hasRootVars,
  hasDarkThemeVars,
  varCount > 600,
  hasThemeButton,
  hasToggleThemeFunction,
  hasThemeButtonStyle,
  usesLocalStorage
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

if (passedChecks === totalChecks) {
  console.log('✓ All checks passed! Dark mode implementation is complete.');
} else {
  console.log(`⚠ ${passedChecks}/${totalChecks} checks passed. Please review the issues above.`);
}
console.log('='.repeat(60) + '\n');
