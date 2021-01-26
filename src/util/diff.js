const Diff = require('diff');

function cleanForDiscord(txt) {
  var cleanedText = txt;
  cleanedText = cleanedText.replace("*", "\\*");
  cleanedText = cleanedText.replace("_", "\\_");
  cleanedText = cleanedText.replace("~", "\\~");
  return cleanedText;
}

exports.produceDiffMsg = function(txt1, txt2) {
  const textDiff = Diff.diffChars(txt1, txt2);
  return textDiff.map(d => {
    var content = cleanForDiscord(d.value);
    if (d.added) {
      return `**${content}**`;
    } else if (d.removed) {
      return `~~${content}~~`;
    } else {
      return content;
    }
  }).join('');
}