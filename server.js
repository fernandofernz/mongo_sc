// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Requiring Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

// Scraping tools
var request = require("request");
var axios = require("axios");
var cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {
  useMongoClient: true
});
// mongoose.connect("mongodb://localhost/ct_scraperMongoose", {
//   useMongoClient: true
// });


//Define port
var port = process.env.MONGODB_URI || 3000;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// Routes
// ======

//GET requests to render Handlebars pages
app.get("/", function(req, res) {
  Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

app.get("/scrape", function(req, res) {

    axios.get("http://www.christianitytoday.com/ct/en-espanol/").then(function(response) {
    var $ = cheerio.load(response.data);
    //console.log(response.data);

    $(".content-inside").each(function(i, element) {
      // Save an empty result object
      var result = {};

      result.title = $(this).children("a").text();
      result.summary = $(this).children(".deck").text();
      result.link = $(this).children("a").attr("href");

      var entry = new Article(result);
      entry.save(function(err, data) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(data);
        }
      });

    });
        res.send("Scrape Complete");

  });
});

//Routes
app.get("/articles", function(req, res) {
  Article.find({}, function(error, response) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(response);
    }
  });
});

app.get("/articles/:id", function(req, res) {
  Article.findOne({ "_id": req.params.id })
  .populate("note").exec(function(error, response) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(response);
    }
  });
});

app.post("/articles/save/:id", function(req, res) {
      Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})
      .exec(function(err, response) {
        if (err) {
          console.log(err);
        }
        else {
          res.send(response);
        }
      });
});

app.post("/articles/delete/:id", function(req, res) {
      Article.findOneAndUpdate({ "_id": req.params.id }, {"saved": false, "notes": []})
      .exec(function(err, response) {
        if (err) {
          console.log(err);
        }
        else {
          res.send(response);
        }
      });
});

app.post("/notes/save/:id", function(req, res) {

  var newNote = new Note({
    body: req.body.text,
    article: req.params.id
  });

  console.log(req.body)

  newNote.save(function(error, note) {
    if (error) {
      console.log(error);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.id }, {$push: { "notes": note } })
      .exec(function(err) {
        if (err) {
          console.log(err);
          res.send(err);
        }
        else {
          res.send(note);
        }
      });
    }
  });
});

app.delete("/notes/delete/:note_id/:article_id", function(req, res) {

  Note.findOneAndRemove({ "_id": req.params.note_id }, function(err) {

    if (err) {
      console.log(err);
      res.send(err);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}})
        .exec(function(err) {
          if (err) {
            console.log(err);
            res.send(err);
          }
          else {
            res.send("Note Deleted");
          }
        });
    }
  });
});

// Listen on port
app.listen(port, function() {
  console.log("App running on port " + port);
});
