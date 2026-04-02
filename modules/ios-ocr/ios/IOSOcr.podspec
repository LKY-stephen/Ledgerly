require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name         = "IOSOcr"
  s.version      = package["version"]
  s.summary      = "iOS Vision OCR module for Expo"
  s.description  = "Local iOS OCR using Apple Vision, exposed to Expo modules."
  s.homepage     = "https://example.com"
  s.license      = "MIT"
  s.author       = "Creator CFO"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://example.com/ios-ocr.git", :tag => s.version }
  s.static_framework = true
  s.dependency "ExpoModulesCore"
  s.source_files = "**/*.{swift,h,m,mm}"
end
