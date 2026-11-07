// Cut the subject out of an image with macOS Vision (same engine as "Lift subject from background").
// swift tools/lift_subject.swift in.png out.png
import Foundation
import Vision
import CoreImage

let a = CommandLine.arguments
guard a.count == 3, let img = CIImage(contentsOf: URL(fileURLWithPath: a[1])) else { print("usage: in out"); exit(2) }
let handler = VNImageRequestHandler(ciImage: img)
let req = VNGenerateForegroundInstanceMaskRequest()
do {
    try handler.perform([req])
    guard let r = req.results?.first else { print("no subject found"); exit(1) }
    let buf = try r.generateMaskedImage(ofInstances: r.allInstances, from: handler, croppedToInstancesExtent: true)
    try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: buf), to: URL(fileURLWithPath: a[2]),
                                           format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
    print("ok", r.allInstances.count, "instance(s)")
} catch { print("error:", error); exit(1) }
