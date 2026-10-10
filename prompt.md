# Game Docs

The overall goal is to create a "todo list" as a website with a local database.

## Tools to use:
- Fiber (go framework)
- Frontend is your choice. (react, html/css, ... you choose)
- sqlite database

## What exactly should it be?

### Who is it for:
Its only for me. noone else will every see it! 
So no special descriptions i dont need. 

### Scope:
it should be simple. this connects with the "no special descriptions". 
Everything should be self explainable. Its a small very easy to maintain project. 
*Less is more*.

### What do i use it for? And how i use it:
Each of the subsubsubsubheaders (####) should be a sperate page.

#### Milestones:
I create a game. i want to use the site to keep track of my milestones and all items. sorted etc. 
Milestones start at Milestone 0 (the inital "game") and then automatically extended with new numbers. 
Each milestone has a title, description and a state of done or not done. 

It should be possible to add more milestones + tasks inside them. 
Taks are the subtasks to do in a milestone. for milestone 0 they have numbers with 0.1, 0.2, and so on. 
Milestone 1 has tasks starting from 1.1, next 1.2 and so on. 

Each task as title, description and also a state of done or not done. 

Tasks can be edited just like milestones. They can also be deleted but i must confirm so no accidental deletions! 
Milestones cant be manually set to "done" or not done. Tasks must be. When i finish a task and mark it as done it should automatically update the progressbar of my milestone. When all are done the Milestone is automatically marked as done.

#### Item track list:
Here i want to add the assets i have in the game.
I have many categories like tools, entities etc. 
I want to add those categories myself. 
Each category *can* have further sub categories. But are not required. but there will be no subsubcategories. so make just 2 layers of them.
In those sub categories (or not sub) i can add new assets. Then there should be on top a general todo list i have to complete (also defined by me) like "icon", "sprite". then there must be two checkmarks, one for icon, one for sprite and when both are checked. its considered as done! when only one of those 2 it should have a small progress bar with half done. But rememeber that there should be the option to add more than 2 or less than two. 
Each category (tools, entities) can has those todos seperately so each subcategory or or item directly has them then. 

#### General Information:
Here i want to add documentation for differnet stuff. Im not too sure how. Here you can get a little bit creative. 
But here is want i want to do with this section:
I want to write done my general topics like code conventions, project structure and such stuff. Dont hardcode these topics. Make that i can create them myself and write down what i want in a good way without having a huge text block. I want some sort of editing of the text like new lines, headers, subheaders etc. Dont reinvent the wheel. Some basic rich text (markup) is fine!

### Text inputs:
For each text i want to be able to add lists, color text and rich text functions to make more clear stuff!
also add headers/subheaders etc in the text. not in titles but in descriptions or general text!

## How ai must work:
If there are any questions or unclear instruction in this document ask me. Dont think what is best. Ask the prompter directly so there are no unexpected results! 
Dont halucinate into something!
Dont underestimate the project. Keep a logical structure in the code! Everyting in english.
First think and then code - not dhe other way around. This means that you work with the yagni principle. No duplicate code. Reuse functions. This is especially in the frontend! 

## Design
Keep it in a catppuccin-mocha theme. Colorcode the the pages (milestones, item track list, ...). 
create if main page if useful. if not descide what is the entry page. 
Try to minimize the required mouse movement to do stuff. also the mouse clicks. its a small site just for me. it must be useful (and good looking). Others never need to navigate! 
Maybe add a sidebar for quick access. 
For the frontend. First think then act as stated in the "How ai must work". Reuse stuff. keep things modular to make them easily swappable by something else if i dont like it!

