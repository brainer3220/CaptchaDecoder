function resize_image(img) {
    let dst = new cv.Mat();
    let dsize = new cv.Size(200, 50, 1);
    // You can try more different parameters
    cv.resize(img, dst, dsize, 0, 0, cv.INTER_AREA);
}
