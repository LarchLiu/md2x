import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var pendingFileURL: URL?
  private var fileChannel: FlutterMethodChannel?
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    
    // Check if app was launched with a file URL
    if let url = launchOptions?[.url] as? URL {
      pendingFileURL = url
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // Set up method channel using FlutterPluginRegistry API (called after engine is ready)
  override func registrar(forPlugin pluginKey: String) -> FlutterPluginRegistrar? {
    let registrar = super.registrar(forPlugin: pluginKey)
    
    // Initialize file channel on first plugin registration if not yet set up
    if fileChannel == nil, let registrar = registrar {
      setupMethodChannel(with: registrar.messenger())
    }
    
    return registrar
  }
  
  private func setupMethodChannel(with messenger: FlutterBinaryMessenger) {
    fileChannel = FlutterMethodChannel(
      name: "com.example.markdown_viewer_mobile/file",
      binaryMessenger: messenger
    )
    
    fileChannel?.setMethodCallHandler { [weak self] (call, result) in
      if call.method == "getInitialFile" {
        if let url = self?.pendingFileURL {
          self?.readFileAndReturn(url: url, result: result)
          self?.pendingFileURL = nil
        } else {
          result(nil)
        }
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
  }
  
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // Handle file opened from Files app or other apps
    if url.isFileURL {
      handleFileURL(url)
      return true
    }
    return super.application(app, open: url, options: options)
  }
  
  private func handleFileURL(_ url: URL) {
    // Need to access security-scoped resource
    let accessing = url.startAccessingSecurityScopedResource()
    defer {
      if accessing {
        url.stopAccessingSecurityScopedResource()
      }
    }
    
    do {
      let content = try String(contentsOf: url, encoding: .utf8)
      let filename = url.lastPathComponent
      
      // Send to Flutter
      fileChannel?.invokeMethod("onFileReceived", arguments: [
        "content": content,
        "filename": filename
      ])
    } catch {
      print("Failed to read file: \(error)")
    }
  }
  
  private func readFileAndReturn(url: URL, result: @escaping FlutterResult) {
    let accessing = url.startAccessingSecurityScopedResource()
    defer {
      if accessing {
        url.stopAccessingSecurityScopedResource()
      }
    }
    
    do {
      let content = try String(contentsOf: url, encoding: .utf8)
      let filename = url.lastPathComponent
      result([
        "content": content,
        "filename": filename
      ])
    } catch {
      print("Failed to read file: \(error)")
      result(nil)
    }
  }
}
