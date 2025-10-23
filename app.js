// ✅ Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// ✅ Express setup
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ✅ Connect to MongoDB Atlas using environment variable
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/todoListDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Schema & Models
const itemsSchema = new mongoose.Schema({
    name: String
});
const Item = mongoose.model("Item", itemsSchema);

const defaultItems = [
    new Item({ name: "Read Book" }),
    new Item({ name: "Write Sai's Record" })
];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});
const List = mongoose.model("List", listSchema);

// ✅ Home Route (Today List)
app.get("/", async (req, res) => {
    try {
        const foundItems = await Item.find({});
        if (foundItems.length === 0) {
            await Item.insertMany(defaultItems);
            return res.redirect("/");
        }
        res.render("list", { ListTitle: "Today", newListItems: foundItems });
    } catch (err) {
        console.log(err);
    }
});

// ✅ Custom List Route
app.get("/:customListName", async (req, res) => {
    const customListName = req.params.customListName.toLowerCase();
    const displayName = customListName.charAt(0).toUpperCase() + customListName.slice(1);

    try {
        const foundList = await List.findOne({ name: new RegExp("^" + customListName + "$", "i") });
        if (foundList) {
            res.render("list", { ListTitle: displayName, newListItems: foundList.items });
        } else {
            const list = new List({
                name: customListName,
                items: defaultItems
            });
            await list.save();
            res.redirect("/" + customListName);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong!");
    }
});

// ✅ Add New Item
app.post("/", async (req, res) => {
    const itemName = req.body.newItem;
    const listName = req.body.list;
    const item = new Item({ name: itemName });

    try {
        if (listName === "Today") {
            await item.save();
            res.redirect("/");
        } else {
            const foundList = await List.findOne({ name: new RegExp("^" + listName + "$", "i") });
            if (foundList) {
                foundList.items.push(item);
                await foundList.save();
                res.redirect("/" + listName.toLowerCase());
            } else {
                const newList = new List({
                    name: listName.toLowerCase(),
                    items: [item]
                });
                await newList.save();
                res.redirect("/" + listName.toLowerCase());
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong!");
    }
});

// ✅ Delete Item
app.post("/delete", async (req, res) => {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    try {
        if (listName === "Today") {
            await Item.findByIdAndDelete(checkedItemId);
            res.redirect("/");
        } else {
            await List.findOneAndUpdate(
                { name: new RegExp("^" + listName + "$", "i") },
                { $pull: { items: { _id: checkedItemId } } }
            );
            res.redirect("/" + listName.toLowerCase());
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong while deleting item!");
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});
