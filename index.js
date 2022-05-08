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
    //lorsque l’utilisateur clique sur le bouton de connexion, nous vérifions si l’utilisateur a écrit quelque chose dans
    document.querySelector("#log-in-button").onclick = ()=>{    
        if(!loginName.value) openAlert("You must input a name");    //si non, nous affichons une fenêtre d’erreur
        else client.emit("log-in-attempt",loginName.value); //si oui, nous envoyons le login attempt au serveur
    };
    document.querySelector(".chat-button").onclick = sendMessage;   //lorsque nous cliquons sur le bouton du chat, le msg s'envoi

    //les quelques events suivants montrent différentes fenêtres d’erreur en fonction du type d’erreur reçu
    client.on("error-not-enough-players",()=>{openAlert("Two players are required for the game")});
    client.on("error-name-taken",()=>{openAlert("The name you chose is already taken")});
    client.on("error-game-started",()=>{openAlert("The game has already started")});
    client.on("error-full-lobby",()=>{openAlert("The game lobby is full")});

    client.on("log-in-success",()=>{
        //si la connexion est réussie, nous en informons l’utilisateur avec le texte vert
        document.querySelector(".log-in-display").innerHTML = "Log in successful";
        //nous désactivons l'input du pseudo
        document.querySelector("#log-in-name").disabled = true;
        //et nous changeons le bouton de connexion en bouton de démarrage du jeu
        let loginButton = document.querySelector("#log-in-button");
        loginButton.onclick = ()=>{client.emit("initiate-game")}
        loginButton.innerHTML = "Start Game";
    });
    client.on("start-game",(accounts)=>{
        //update de players et currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }

        let playerName = document.querySelectorAll(".player-name");
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){   //Boucle for sur tout les joueurs
            //nous montrons les joueurs avec pseudo des gens co
            playerName[i].style.display = "flex";
            playerHolder[i].style.display = "flex";
            //nous ajoutons un élément de dos de carte et lui donnons la bonne classe
            let allCards = document.createElement("div");
            allCards.className = "card-back";
            //nous entrons le nombre de cartes sur le dessus du jeu
            allCards.innerHTML = accounts[i].deck.length;
            playerHolder[i].appendChild(allCards);
            //on input les pseudo actuel dans les tag qui s'afficherons pendant la game
            playerName[i].innerHTML = accounts[i].name;
        }

        let loginWindow = document.querySelector("#log-in-window"); //puis on fade out la window de log in
        loginWindow.style.animation = "fadeOut linear 0.2s";
        loginWindow.onanimationend = ()=>{
            loginWindow.style.display = "none";
            loginWindow.onanimationend = "";

            //ensuite on fade in la game div
            let gameHolder = document.querySelector(".game-holder");
            gameHolder.style.animation = "fadeIn linear 0.2s";
            gameHolder.style.display = "block";
        }
    });
    client.on("new-message",(message)=>{
        //Si currPlayer est logged alors on appelle function NewMessage
        if(currPlayer != undefined) newMessage(message);
    });
    //lorsque l’utilisateur clique sur le bouton play, tirage de carte
    document.querySelector("#center-button").onclick = ()=>{client.emit("play-move")};
    client.on("add-shown-card",(accounts)=>{
        //update de players et currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //affichage du mask sur le play boutton 
        document.querySelector(".center-button-mask").style.display = "block";
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){   //boucle if sur les joueurs
            playerHolder[i].children[0].innerHTML = accounts[i].deck.length;    //update le nombre de carte dans le deck
            if(accounts[i].deck.length > 0){    //si carte dans le deck
                //creation d'une new div puis on lui donne la creation de card class
                let newCard = document.createElement("div");
                newCard.className = "card";
    
                //nous obtenons la valeur de la carte qui est montrée
                let newcardValue = accounts[i].shown[accounts[i].shown.length-1];
                let allType = ["clubs","diamonds","hearts","spades"];
                let allValue = ["J","Q","K","A"];
                let type = allType[newcardValue.type];
                //nous obtenons le type de la carte
                let value;
                //nous obtenons la valeur de la carte
                if(newcardValue.value > 11) value = allValue[newcardValue.value-12];
                else value = "r"+JSON.stringify(newcardValue.value).padStart(2,"0");

                //et sur la base des deux, nous obtenons l’image appropriée à placer sur la carte div
                newCard.style.backgroundImage = "url(images/"+type+"/"+type+"-"+value+".svg)";
                playerHolder[i].appendChild(newCard);
            }
        }
    });
    client.on("shown-card-result",(accounts)=>{
        //update de players et currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //hide du bouton central mask
        document.querySelector(".center-button-mask").style.display = "none";
        let playerHolder = document.querySelectorAll(".player-holder");
        for(let i = 0; i < accounts.length; i++){
            //update du nbr de carte
            playerHolder[i].children[0].innerHTML = accounts[i].deck.length;
            //et nous enlevons tous les divs du div du holder des joueurs à l’exception du premier (deck)
            while(playerHolder[i].children.length > 1) playerHolder[i].removeChild(playerHolder[i].lastChild);
        }
    });
    client.on("war",(accounts)=>{
        //hide le boutton central mask
        document.querySelector(".center-button-mask").style.display = "none";
         //update de players et currPlayer 
        players = accounts;
        for(let i = 0; i < players.length; i++){
            if(players[i].id === client.id){
                currPlayer = players[i];
                break;
            }
        }
        //update du nombre de carte dans le deck
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
