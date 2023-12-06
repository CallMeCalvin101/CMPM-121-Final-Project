# Steven Ren - 11/19/2023
## Introducing the team
- Vincent Kurniadjaja - Tools Lead
- Steven Ren - Engine Lead
- Gordon Cai - Design Lead
- Jane Tran: General Assistant
- Tony Guizar: Backup

## Tools and materials
We decided to use Unity to make a 2d game. We chose Unity because there isn't a lot of overlap between the engines that we know between us and some of us are more experienced and comfortable with Unity than Phaser.

For Unity, we'll mostly be using C# as that is the language that Unity uses. We chose to use this lanaguage because a lot of us have past experience with them due to our past game projects and/or previous classes that taught them.

I expect us to use Visual Studio 2022 as that is the default IDE for Unity or maybe some of us will stick with Visual Studio Code instead. We want to keep our options open so we are considering form multiple sources like Tiled, the Unity Store, or other sources we find while doing research that seems promising. Some of us have experience with Tiled from CMPM120 and others have experience with the Unity Asset Store as well so if any of our members don't know how to use it, the rest of us can help them.

## Outlook
We anticipate the hardest part of this assignment to be the suprise requirements. The suprise requirements might cause us to redo and reformat a lot of our code in the future to meet the conditions and might even cause us to completely start from the ground up if the requirement is too out-of-the-way for our current code. 
Through this project, we hope to hone our programming skills, and train them to be more flexible when suprise changes are needed. We also hope to learn more about our programming engine and how to work as a team to produce a game.

# Tony Guizar - 11/29/2023
## F0 devblog
F0 A: We have a Character class that is used to render a rectangle on a canvas representing the farmer. There is an event listener for arrow keys that changes the farmer's position and redraws the rectangle on the canvas.

F0 B: We have an event listener for the “t” key that simulates time by updating the game state with randomly generated values for weather and checking the plant growth, then logging the plant levels and game state. 

F0 C: The player can move into a Cell and press the spacebar to interact with the cell. If there is a plant on the cell, the player is given the option to reap. If the cell is currently empty, the player is prompted to plant a plant of their choice.


F0 E: Each plant on the grid has a type: Sunflower, Rose, or Crabgrass(weed), each plant has a growth level, starts at 0 and grows based on sun and rain levels.

F0 F: Our Plant class has methods for simulating the effect of watering or exposure to sun based on the current sun and rain levels. Plant growth is unlocked when satisfying the water requisite and the sun requisite. 

F0 G: To implement this scenario feature, we decided to create a separate class that will track 1 unique condition, the number required to satisfy the condition, as well as how far the player is to satisfy to max total. To keep things organized, we decided to put this class (known as Scenario) into its own TS file, called scenario.ts. After testing, we integrated the class by including an update function to update said class that is called each time the player changes the time.

Reflection
Our group didn’t really have much plans on what we wanted to do together at the start. All of us focused on just satisfying the requirements, with each member working on different classes and sections. When it came time to integrate everything together, we found that it was hard to follow which parts belonged to what, since we haven’t communicated how something was implemented, which made changing and adding on to code be confusing. We also are learning to resolve merge conflicts as well. What we have for F0 is basically a skeleton of the basics of the game, and moving forward, we are going to communicate more often and clearly about what our vision of the final game should be, and what steps we need to do to satisfy it.

# Steven Ren - 11/29/2023
## F0 devblog
F0 D:  Depending on the current weather, there is a different chance of each cell getting water and sun. When it rains, there's a 70% chance of a cell getting 2 levels of water and a 20% chance of getting sun. When it's sunny, there's a 70% chance for a cell to lose a level of water and a 80% chance to get sun. It is not possible to lose water levels on a rainy day but there is also no ways to gain water levels on a sunny day. Each cell's sun is independent of each other.

# Tony Guizar & Vincent Kurniadjaja - 12/6/2023
## F1 devblog
## F1 A: Bytearray diagram
![F1.a data structure diagram](./Devlog%20images/IMG_0020.png)

## F1 B:
The undo/redo system is implemented by tracking game states across play. When the player interacts with a cell, the new game state is pushed to an array of `GameState` objects. When a player wants to undo their last action, the current game state is popped from the `states` array and pushed to a `redoStack` array. The previous game state (which is now the newest element in the `state` array is then applied to the current game state and all UI is updated. Similarly, when the player has a redo action available, the gamestate is popped from the `redoStack` and pushed to the `states` array and is then applied to the current game state, then the UI is updated.

## F1 C:
The player is able to manually save their current game using the “S” key. The player is prompted to select an optional name for their saved game. A saved game is just an array of `GameState` objects and we used a map called `savedGameStates` that maps strings(names of saved games) to arrays of `GameState` objects. We have an event listener for “beforeunload” event that will save the `savedGameStates` map to local storage before the document is unloaded. The player can also load a saved game using the “L” key. The player will be prompted to select a saved game and the array of `GameStates` will replace the current `states` array, allowing the player to load a saved game while still having access to their game state history, preserving the undo/redo system across loaded games. The player can also use the “d” key to delete all saved games and start the game over.

## F1 D:
The implicit auto-save feature is implemented as an array of `GameState` objects that are saved to localstorage. Whenever a player interacts with a cell, or passes time using the “t” key, the new game state is pushed to a `states` array that holds the game state history for the current game. When the game is loaded, the code checks if there is a “states” key in localstorage, and if there is, that game is loaded into the current game, allowing players to resume play in the event of an unexpected quit.
