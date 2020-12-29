MAX_SIZE = 1000;

function getCellElement(i, j) {
  return document.getElementById("cell" + i + "_" + j);
}

function getCellColor(cell) {
  return cell.style.backgroundColor;
}

function getBoardContents() {
  var matrix = [];
  for (var i = 0; i < MAX_SIZE; i++) {
    var row = [];
    for (var j = 0; j < MAX_SIZE; j++) {
      var cell = getCellElement(i, j);
      if (cell) {
        row.push(getCellColor(cell));
      } else {
        break;
      }
    }
    if (row.length) {
      matrix.push(row);
    } else {
      break;
    }
  }
  return matrix;
}

function getPenColor() {
  return document.getElementById("color").value;
}

var mouseDown;
document.addEventListener('mousedown', function(){
  mouseDown = true;
});
document.addEventListener('touchstart', function(){
  mouseDown = true;
});
document.addEventListener('mouseup', function(){
  mouseDown = false;
});
document.addEventListener('touchend', function(){
  mouseDown = false;
});

function rgb2hex(rgb) {
    rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function fill(i, j, newColor) {
  var queue = [[i, j]];
  var oldColor = getCellElement(i, j).style.backgroundColor;
  getCellElement(i, j).style.backgroundColor = newColor;
  newColor = getCellElement(i, j).style.backgroundColor;
  getCellElement(i, j).style.backgroundColor = oldColor;
  var undoOps = [];
  while (queue.length) {
    var pos = queue.pop();
    var cell = getCellElement(pos[0], pos[1]);
    if (!cell ||
        cell.style.backgroundColor != oldColor ||
        cell.style.backgroundColor == newColor)
      continue;
    undoOps.push({
                   pos: [pos[0], pos[1]],
                   oldColor: oldColor
                 });
    cell.style.backgroundColor = newColor;
    queue.push([pos[0] - 1, pos[1]]);
    queue.push([pos[0] + 1, pos[1]]);
    queue.push([pos[0], pos[1] - 1]);
    queue.push([pos[0], pos[1] + 1]);
  }
  undoLog.push(undoOps);
}

function handleCellEvent(i, j, click) {
  if (!click && !mouseDown) {
    return;
  }
  var cell = getCellElement(i, j);
  if (picker) {
    var color = cell.style.backgroundColor;
    if (!color) {
      color = "#ffffff";
    } else {
      color = rgb2hex(color);
    }
    document.getElementById("color").value = color;
    togglePicker();
    return;
  }
  if (tool == "pen") {
    undoLog.push([{
                   pos: [i, j],
                   oldColor: cell.style.backgroundColor
                 }]);
    cell.style.backgroundColor = getPenColor();
    saveSnapshotThrottled();
  } else if (tool == "fill") {
    fill(i, j, getPenColor());
    saveSnapshotThrottled();
  }
}

function undoOnce() {
  var ops = undoLog.pop();
  while (ops.length) {
    var op = ops.pop();
    var cell = getCellElement(op.pos[0], op.pos[1]);
    cell.style.backgroundColor = op.oldColor;
  }
}

function createCellClickHandler(i, j) {
  return function() {
    handleCellEvent(i, j, true);
  }
}

function createCellMoveHandler(i, j) {
  return function() {
    handleCellEvent(i, j, false);
  }
}

var undoLog = [];

function resizeBoard() {
  undoLog = [];
  var oldBoard = getBoardContents();
  var width = document.getElementById("width").value;
  var height = document.getElementById("height").value;
  var board = document.createElement("tbody");
  for (var i = 0; i < height; i++) {
    var row = document.createElement("tr");
    for (var j = 0; j < width; j++) {
      var cell = document.createElement("td");
      cell.setAttribute("id", "cell" + i + "_" + j);
      cell.setAttribute("draggable", "false");
      cell.onclick = createCellClickHandler(i, j);
      if (i < oldBoard.length && j < oldBoard[i].length) {
        cell.style.backgroundColor = oldBoard[i][j];
      } else {
        cell.style.backgroundColor = "#ffffff";
      }
      row.appendChild(cell);
    }
    board.appendChild(row);
  }
  board.style.fontSize = fontSize + "px";
  document.getElementById("board").replaceWith(board);
  board.setAttribute("id", "board");
  saveSnapshotThrottled();
}

function clearBoard() {
  undoLog = [];
  var width = document.getElementById("width").value;
  var height = document.getElementById("height").value;
  for (var i = 0; i < height; i++) {
    for (var j = 0; j < width; j++) {
      var cell = getCellElement(i, j);
      cell.style.backgroundColor = "#ffffff";
    }
  }
  saveSnapshot();
}

var tool;
var picker = false;
function setToolEnableColor(toolName) {
  if (tool == toolName) {
    document.getElementById(toolName).classList.remove("bg-gray-500");
    document.getElementById(toolName).classList.add("bg-blue-500");
  } else {
    document.getElementById(toolName).classList.add("bg-gray-500");
    document.getElementById(toolName).classList.remove("bg-blue-500");
  }
}

function setToolEnableColors() {
  setToolEnableColor("pen");
  setToolEnableColor("fill");
}

function setTool(toolName) {
  tool = toolName;
  setToolEnableColors();
}

function togglePicker() {
  picker = !picker;
  if (picker) {
    document.getElementById("picker").classList.add("bg-blue-700");
    document.getElementById("picker").classList.remove("bg-blue-500");
  } else {
    document.getElementById("picker").classList.remove("bg-blue-700");
    document.getElementById("picker").classList.add("bg-blue-500");
  }
}

function imageToPngData(factor) {
  var board = getBoardContents();
  var canvas = document.createElement("canvas");
  canvas.width = board[0].length * factor;
  canvas.height = board.length * factor;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board[0].length; j++) {
      ctx.fillStyle = board[i][j];
      ctx.fillRect(j * factor, i * factor, factor, factor);
    }
  }
  return canvas.toDataURL();
}

function exportImage(factor) {
  var link = document.createElement('a');
  link.download = "pixel-" + (factor == 1 ? "small-" : "large-") +
      (new Date()).toISOString().replaceAll(/[T:.]/g, "-").replaceAll("Z", "") + ".png";
  link.href = imageToPngData(factor);
  link.click();
}

function imageFromPngData(dataURL) {
  var img = new Image;
  img.onload = function() {
    document.getElementById("width").value = img.width;
    document.getElementById("height").value = img.height;
    resizeBoard();
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
        var p = ctx.getImageData(j, i, 1, 1).data;
        getCellElement(i, j).style.backgroundColor = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
      }
    }
  };
  img.src = dataURL;
}

function saveSnapshot() {
  localStorage.setItem("current", imageToPngData(1));
}

var snapshotTimer;
function saveSnapshotThrottled() {
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(saveSnapshot, 3000);
}

function loadSnapshot() {
  var data = localStorage.getItem("current");
  if (data) {
    imageFromPngData(data);
  }
}

var fontSize = 24;
function initHandlers() {
  var resizeTimer;
  document.getElementById("width").onchange = function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeBoard, 1000);
  }
  document.getElementById("height").onchange = document.getElementById("width").onchange;
  document.getElementById("pen").onclick = function() {
    setTool("pen");
  }
  document.getElementById("fill").onclick = function() {
    setTool("fill");
  }
  document.getElementById("pen").click();
  document.getElementById("zooms").onclick = function() {
    fontSize -= 4;
    if (fontSize < 4) {
      fontSize = 4;
    }
    document.getElementById("board").style.fontSize = fontSize + "px";
  }
  document.getElementById("zooml").onclick = function() {
    fontSize += 4;
    document.getElementById("board").style.fontSize = fontSize + "px";
  }
  document.getElementById("picker").onclick = function() {
    togglePicker();
  }
  document.getElementById("export").onclick = function() {
    exportImage(1);
  }
  document.getElementById("export2").onclick = function() {
    exportImage(16);
  }
  document.getElementById("clear").onclick = function() {
    if (window.confirm("Do you really want to clear the image? This cannot be undone.")) {
      clearBoard();
    }
  }
  document.getElementById("undo").onclick = function() {
    undoOnce();
  }
}

initHandlers();
resizeBoard();
loadSnapshot();
