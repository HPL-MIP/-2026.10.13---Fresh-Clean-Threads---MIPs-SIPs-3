Lets create a the trex-game alternative for this advertisement.

ive provided the assets in Assets folder

Layout
- 4 Scenes (Intro Scene, Game Scene and Product Scene, Endcard)
- use portrait.webp as background for portrait
- use landscape.webp as background for landscape
- use bottom_platform.webp as the ground for the game. its already 2k by 2k for responsiveness, incase it goes landscape orientation.
- use Roboto-Regular.ttf for the scoreboard of "0 out of 6" till "6 out of 6" font size is 33.47, black color.


Intro Scene;
- try to copy the introscene image from PreviewImages folder for layout.
- this scene have the Logo.webp, ScoreBoard.webp, TAP TO START.webp, ball.webp.

Game Scene;
- use GameScene.png as reference for layout
- this is where we add the moving obstacle, theres 4 types of obstacle with different height randomize spawn them and slide them from right to left, once the game start.
- make sure theres enough spacing in between each obstacle for the ball to be able to jump again and react accordingly.
- position the tshirts either on top of the obstacle or in between the obstacles on the ground. make sure to spawn only 1 of each tshirt. since we will be collecting 

Product Scene;
- use ProductScene.png as reference for layout  
- This will be a overlay scene, our main background is the gamescene, then the bg for product scene will be a panel color #696969 and 80% opacity.
- in front of that panel, will be the CONGRATULATIONS!.webp, product.webp, Fall Essentials Crew 6Pack.webp then CTA at the bottom

Encard
- just use temporary_endcard.html


Gameplay, Animation and flow.
- On Scene 1, its just a static scene, the obstacles only moves when user pressed anywhere on the screen. 
- to play this, if a user tap on the screen, the ball jumps. same as trex game.
- once user pressed the screen, fade out the TAP TO START.webp and animate the obstacle sliding from right to left, offsetted at the very right of the screen. spawn random obstacles and add the tshirts randomly, maybe add each tshirt at every 2 or 3 obstacles.
- if a tshirt has been collected by the ball, pop Poof.webp, then fade out the tshirt and poof. 
- till all tshirts has been completed.
- if the ball has hit the obstacle, stop the game, and reset the game to intro scene.
- if all 6 tshirts has been collected, stop the game and fade in the product scene.
- when product scene appears, consecutively fade in pulse out each items from top to bottom excluding the LOGO and CTA (CONGRATULATIONS!.webp,product.webp and Fall Essentials Crew 6Pack.)
- Display the product scene for 2 seconds then fade in the endcard. which is the temporary_endcard.html.

 