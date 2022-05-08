/*--Initialisation----------------------------------------------------------------------------------------------------------------------------------------*/
window.oncontextmenu = (e)=>{e.preventDeafult()}    //Sa bloque la pop up quand click droit
window.onload = initLoad;   //lorsque la page se charge, appel de la fonction initLoad

//Initialisation des variables du jeu
let currPlayer, players = [], client = io();
function initLoad(){
    //on effaçe les éléments input de toutes les valeurs saved
    document.querySelector("#log-in-name").value = "";
    document.querySelector("#chat-input").value = "";
    //et nous ajoutons tous les events nécessaires
    addEvents();
}
//une fonction qui ouvre une popup avec une notif
function openAlert(text){
    //nous obtenons le background mask de la fenêtre d’alerte et la fenêtre d’alerte elle-même
    let mask = document.querySelector(".alert-mask");
    let alert = document.querySelector("#alert");
    //nous ajoutons le texte à la fenêtre d’alerte
    alert.innerHTML = text;

    //Ensuite on fade in la fenêtre et 3 secondes plus tard on la fade out pour qu'elle disparait
    mask.style.animation = "fadeIn linear 0.2s";
    mask.style.display = "block";
    setTimeout(()=>{
        mask.style.animation = "fadeOut linear 0.2s";
        mask.onanimationend = ()=>{
            //On la cache à la fin du fade out
            mask.style.display = "none";
            mask.onanimationend = "";
        }
    },3000);
}

/*--Events-----------------------------------------------------------------------------------------------------------------------------------------*/
function addEvents(){
    let loginName = document.querySelector("#log-in-name");
    //when the user click on the log in button we check if the user has written anything in
    document.querySelector("#log-in-button").onclick = ()=>{    
        if(!loginName.value) openAlert("You must input a name");    //if no then we show an error window
        else client.emit("log-in-attempt",loginName.value); //if yes we send the login attemp to the server
    };
    document.querySelector(".chat-button").onclick = sendMessage;   //when we click on the chat button we send the given message to the chat

    //the following few events show different error windows depending on the recieved error type
    client.on("error-not-enough-players",()=>{openAlert("Two players are required for the game")});
    client.on("error-name-taken",()=>{openAlert("The name you chose is already taken")});
    client.on("error-game-started",()=>{openAlert("The game has already started")});
    client.on("error-full-lobby",()=>{openAlert("The game lobby is full")});

    client.on("log-in-success",()=>{
        //if the log in is succesfull we notify the user with the green text
        document.querySelector(".log-in-display").innerHTML = "Log in successful";
        //we disable the name input
        document.querySelector("#log-in-name").disabled = true;
        //and we chage the log in button to the start game button
        let loginButton = document.querySelector("#log-in-button");
        loginButton.onclick = ()=>{client.emit("initiate-game")}
        loginButton.innerHTML = "Start Game";
    });
    client.on("start-game",(accounts)=>{
        //we update the players and currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }

        let playerName = document.querySelectorAll(".player-name");
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){   //we loop through all the players
            //we show the card holders and name tags of the logged in players
            playerName[i].style.display = "flex";
            playerHolder[i].style.display = "flex";
            //we add a card back element and give it the right class
            let allCards = document.createElement("div");
            allCards.className = "card-back";
            //we input the number of cards on top of the deck
            allCards.innerHTML = accounts[i].deck.length;
            playerHolder[i].appendChild(allCards);
            //we the input the current name in the name tag
            playerName[i].innerHTML = accounts[i].name;
        }

        let loginWindow = document.querySelector("#log-in-window"); //we then fade out the log in window
        loginWindow.style.animation = "fadeOut linear 0.2s";
        loginWindow.onanimationend = ()=>{
            loginWindow.style.display = "none";
            loginWindow.onanimationend = "";

            //and when the fade out is complete we fade in the game div
            let gameHolder = document.querySelector(".game-holder");
            gameHolder.style.animation = "fadeIn linear 0.2s";
            gameHolder.style.display = "block";
        }
    });
    client.on("new-message",(message)=>{
        //if the currPLayer is logged in we call the new message function
        if(currPlayer != undefined) newMessage(message);
    });
    //when the user clicks the center button we make make a move
    document.querySelector("#center-button").onclick = ()=>{client.emit("play-move")};
    client.on("add-shown-card",(accounts)=>{
        //we update the players and currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //we show the mask over the play move button
        document.querySelector(".center-button-mask").style.display = "block";
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){   //we loop through the players
            playerHolder[i].children[0].innerHTML = accounts[i].deck.length;    //we update the number of cards in the deck
            if(accounts[i].deck.length > 0){    //if there are cards in the deck
                //we create a new div and give it the card class
                let newCard = document.createElement("div");
                newCard.className = "card";
    
                //we get the value of the card that is being shown
                let newcardValue = accounts[i].shown[accounts[i].shown.length-1];
                let allType = ["clubs","diamonds","hearts","spades"];
                let allValue = ["J","Q","K","A"];
                let type = allType[newcardValue.type];
                //we get the type of the card
                let value;
                //we get the value of the card
                if(newcardValue.value > 11) value = allValue[newcardValue.value-12];
                else value = "r"+JSON.stringify(newcardValue.value).padStart(2,"0");

                //and based on the two we get the proper image to place on the card div
                newCard.style.backgroundImage = "url(images/"+type+"/"+type+"-"+value+".svg)";
                playerHolder[i].appendChild(newCard);
            }
        }
    });
    client.on("shown-card-result",(accounts)=>{
        //we update the players and currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //we hide the central button mask
        document.querySelector(".center-button-mask").style.display = "none";
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){
            //we update the card numbers
            playerHolder[i].children[0].innerHTML = accounts[i].deck.length;
            //and we remove all divs from the players holder div except the first one (deck)
            while(playerHolder[i].children.length > 1) playerHolder[i].removeChild(playerHolder[i].lastChild);
        }
    });
    client.on("war",(accounts)=>{
        //we hide the central button mask
        document.querySelector(".center-button-mask").style.display = "none";
         //we update the players and currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //and we update the deck card number
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++) playerHolder[i].children[0].innerHTML = accounts[i].deck.length;
    });
    client.on("add-war-cards",(accounts)=>{
        //this function is the same as the add cards event except
        // we add one div of the class card back before the shown card
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        document.querySelector(".center-button-mask").style.display = "block";
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){
            playerHolder[i].children[0].innerHTML = accounts[i].deck.length;
            if(accounts[i].deck.length > 0){
                let newBackCard = document.createElement("div");
                let newCard = document.createElement("div");
                newBackCard.className = "card-back";
                newCard.className = "card";
    
                let newcardValue = accounts[i].shown[accounts[i].shown.length-1];
                let allType = ["clubs","diamonds","hearts","spades"];
                let allValue = ["J","Q","K","A"];
                let type = allType[newcardValue.type];
                let value;
    
                if(newcardValue.value > 11) value = allValue[newcardValue.value-12];
                else value = "r"+JSON.stringify(newcardValue.value).padStart(2,"0");
                newCard.style.backgroundImage = "url(images/"+type+"/"+type+"-"+value+".svg)";
                playerHolder[i].appendChild(newBackCard);
                playerHolder[i].appendChild(newCard);
            }
        }
    });
    client.on("game-over",(accounts)=>{ //when we get the game over event from the server
        for(let i = 0; i < accounts.length; i++){   //we loop through all the players
            if(accounts[i].deck.length != 0){   //we find the one that still has cards
                openAlert(accounts[i].name+" won"); //we send an alert showing who the winnwe is
                setTimeout(()=>{location.reload()},3000);   //and then 3 seconds later we reload the page disconnecting the current user and reseting everythin
                break;
            }
        }
    });
    client.on("player-disconnect",()=>{ //when an user disconnects 
        openAlert("Disconnected");  //we show an alert informing the current user that there has been a disconnection
        setTimeout(()=>{location.reload()},3000);   //and then when that alert dissapears we reload the page dissconnecting the current user as well and reseting everyting
    });
}

/*--Chat-------------------------------------------------------------------------------------------------------------------------------------------*/
function sendMessage(){
    //we get the input element
    let chatInput = document.querySelector("#chat-input");
    if(chatInput.value){
        //and if something is written inside of it we send the new message event to the server
        client.emit("new-message",{name:currPlayer.name,text:chatInput.value});
        //and then we clear the input element
        chatInput.value = "";
    }
}
function newMessage(message){
    //we get the chat element and we make 3 div elements
    let chat = document.querySelector(".chat");
    let mssg = document.createElement("div");
    let name = document.createElement("div");
    let text = document.createElement("div");

    //we give them the right classes
    mssg.className =  "chat-log";
    name.className = "chat-name";
    text.className = "chat-text";

    //we fill in their values
    name.innerHTML = message.name+":";
    text.innerHTML = message.text;

    //and we append them to the right parent elements
    mssg.appendChild(name);
    mssg.appendChild(text);
    chat.appendChild(mssg);
}   
