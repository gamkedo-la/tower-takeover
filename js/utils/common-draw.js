function centerText(text, centerX, bottomY, color, fontSize){
    canvasContext.fillStyle = color;
    var alignWas = canvasContext.textAlign;
    canvasContext.textAlign = "center";
    var fontWas = canvasContext.font;
    canvasContext.font = fontSize + "px Arial"
    canvasContext.fillText(text, centerX, bottomY);
    canvasContext.textAlign = alignWas;
    canvasContext.font = fontWas;
}

function centerBox(centerX, centerY, boxWidth, boxHeight, boxColor){
    canvasContext.fillStyle = boxColor;
    canvasContext.fillRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
}