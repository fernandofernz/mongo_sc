// Require mongoose
var mongoose = require("mongoose");
// Create a schema 
var Schema = mongoose.Schema;

var NoteSchema = new Schema({
    body: {
        type: String
    },
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article"
    }
});

var Note = mongoose.model("Note", NoteSchema);
module.exports = Note;