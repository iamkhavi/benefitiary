#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  'First Load JS': 250, // Next.js recommendation
  'onboarding chunk': 50,
  'ui chunk': 30,
  'Total Size': 500
}

function analyzeBundleSize() {
  console.log('🔍 Analyzing bundle size...\n')
  
  try {
    // Build the application
    console.log('Building application...')
    execSync('npm run build', { stdio: 'inherit' })
    
    // Read the build output
    const buildDir = path.join(process.cwd(), '.next')
    const buildManifest = path.join(buildDir, 'build-manifest.json')
    
    if (!fs.existsSync(buildManifest)) {
      throw new Error('Build manifest not found. Make sure the build completed successfully.')
    }
    
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'))
    
    // Analyze chunk sizes
    const chunkSizes = {}
    let totalSize = 0
    
    // Get static files info
    const staticDir = path.join(buildDir, 'static')
    if (fs.existsSync(staticDir)) {
      const analyzeDirectory = (dir, prefix = '') => {
        const files = fs.readdirSync(dir)
        
        files.forEach(file => {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          
          if (stat.isDirectory()) {
            analyzeDirectory(filePath, `${prefix}${file}/`)
          } else if (file.endsWith('.js')) {
            const size = Math.round(stat.size / 1024) // Convert to KB
            const chunkName = `${prefix}${file}`
            chunkSizes[chunkName] = size
            totalSize += size
          }
        })
      }
      
      analyzeDirectory(staticDir)
    }
    
    // Display results
    console.log('📊 Bundle Analysis Results:\n')
    console.log('Chunk Sizes:')
    console.log('─'.repeat(50))
    
    Object.entries(chunkSizes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([chunk, size]) => {
        const status = getStatus(chunk, size)
        console.log(`${chunk.padEnd(30)} ${size.toString().padStart(6)} KB ${status}`)
      })
    
    console.log('─'.repeat(50))
    console.log(`Total Size: ${totalSize} KB ${getStatus('Total Size', totalSize)}`)
    
    // Check for performance issues
    const issues = checkPerformanceIssues(chunkSizes, totalSize)
    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues Found:')
      issues.forEach(issue => console.log(`   • ${issue}`))
      console.log('\n💡 Recommendations:')
      console.log('   • Consider code splitting for large chunks')
      console.log('   • Use dynamic imports for non-critical components')
      console.log('   • Optimize dependencies and remove unused code')
    } else {
      console.log('\n✅ Bundle size looks good!')
    }
    
    // Generate report
    generateReport(chunkSizes, totalSize)
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    process.exit(1)
  }
}

function getStatus(chunkName, size) {
  const threshold = getThreshold(chunkName)
  if (size > threshold) {
    return '🔴 LARGE'
  } else if (size > threshold * 0.8) {
    return '🟡 WARN'
  }
  return '🟢 OK'
}

function getThreshold(chunkName) {
  for (const [key, threshold] of Object.entries(THRESHOLDS)) {
    if (chunkName.toLowerCase().includes(key.toLowerCase())) {
      return threshold
    }
  }
  return THRESHOLDS['First Load JS'] // Default threshold
}

function checkPerformanceIssues(chunkSizes, totalSize) {
  const issues = []
  
  // Check total size
  if (totalSize > THRESHOLDS['Total Size']) {
    issues.push(`Total bundle size (${totalSize} KB) exceeds recommended limit (${THRESHOLDS['Total Size']} KB)`)
  }
  
  // Check individual chunks
  Object.entries(chunkSizes).forEach(([chunk, size]) => {
    const threshold = getThreshold(chunk)
    if (size > threshold) {
      issues.push(`Chunk "${chunk}" (${size} KB) exceeds recommended limit (${threshold} KB)`)
    }
  })
  
  return issues
}

function generateReport(chunkSizes, totalSize) {
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    chunks: chunkSizes,
    thresholds: THRESHOLDS,
    issues: checkPerformanceIssues(chunkSizes, totalSize)
  }
  
  const reportPath = path.join(process.cwd(), 'bundle-analysis.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
}

// Run the analysis
if (require.main === module) {
  analyzeBundleSize()
}

module.exports = { analyzeBundleSize }