//--Initialisation des var Constantes---------------------------------------------------------------------------------------------------------------------------------//
//Nous avons toutes les variables utiles au lancement du serveur
const fs = require("fs");
const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

//--Lancement du serveur-----------------------------------------------------------------------------------------------------------------------------------//
//On lance le serveur sur le port 3000 (au choix), ensuite le serveur envoi le index.html à toute personne qui se connecte
app.use(express.static(__dirname));
app.get("/",(req, res)=>{res.sendFile(__dirname+"/index.html")});
server.listen(3000,()=>{console.log("Running at port 3000")});

//--Input et Output----------------------------------------------------------------------------------------------------------------------------------//
io.on("connection",(client)=>{  //Quand un utilisateur se connecte on lui rajoute les events :
    client.on("disconnect",()=>{ //Ici idem mais quand l'utilisateur se deconnecte
        //On lit le data.json pour récuperer les données de connection etc.
        fs.readFile("./data.json",(error,data)=>{
            if(error) console.log("Error reading data from dist\n"+error);
          else{
                //Si pas de message d'erreur, on récupere les données
                let gameData = JSON.parse(data);
                let accounts = gameData.accounts;
                if(gameData.inGame){
                    //On change l'état du jeu/serveur à false si la game est lancée
                    gameData.inGame = false;
                    //Pour annuler la game actuelle
                    io.emit("player-disconnect");
                    //On reset le game data aux valeurs par defaut
                    gameData = {inGame:false,accounts:[],chat:[]};
                    //On re save le data dans le data.json
                    fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                        if(error) console.log("Error reading data from dist\n"+error);
                    });
                }
                //Si la game n'a pas commencer alors on lance boucle for
                //Boucle for permettant de trouver l'id du joueur à celui qui s'est déconnecté pour l'enlever de la liste
                for(let i = 0; i < accounts.length; i++){
                    if(accounts[i].id === client.id){
                        accounts.splice(i,1);
                         //Après ça on re save le data.json dans son état actuel
                        fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                            if(error) console.log("Error reading data from dist\n"+error);
                        });
                        break;
                    }
                }
            }
        });
    });
    client.on("log-in-attempt",(name)=>{    //Quand l'utilisateur essaye de se co avec un pseudo
        fs.readFile("./data.json",(error,data)=>{
            //On recupere le data dans data.json
            if(error) console.log("Error reading data from dist\n"+error);
            else{
                let gameData = JSON.parse(data);
                let accounts = gameData.accounts;
                //On verifie qu'on est max 4 sinon message d'erreur car trop de joueur dans le salon
                if(accounts.length === 4){
                    if(gameData.inGame) client.emit("error-game-started");
                    else client.emit("error-full-lobby");
                }
                else{
                    //Sinon verifier que le pseudo est différent du pseudo de(s) 1/2/3 autre(s) joueur(s)
                    //Boucle for pour vérifier cela, si le pseudo est déja pris on envoi un message d'erreur 
                    let duplicateFound = false;
                    for(let i = 0; i < accounts.length; i++){
                        if(accounts[i].name === name){
                            client.emit("error-name-taken");
                            duplicateFound = true;
                            break;
                        }
                    }
                    //Si 0 duplicat alors on rajoute l'utilisateur à la liste de joueur connecté + message de bienvenu et confirmation de log in
                    if(!duplicateFound){
                        accounts.push({name:name,id:client.id,deck:[],shown:[]});
                        client.emit("log-in-success");
                        //Lancement de la game si 4 joueur connectés au salon
                        if(accounts.length === 4){
                            gameData.chat = [];
                            gameData.inGame = true;
                            startGame(accounts);
                        }
                        //On oublie pas ici de re save le data.json pour éviter des conflit d'autres salons avec les pseudonymes
                        fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                            if(error) console.log("Error reading data from dist\n"+error);
                        });
                    }
                }
            }
        });
    });
    client.on("initiate-game",()=>{     //Si un joueur lance la game alors qu'il est seul alors on lance message d'erreur
        fs.readFile("./data.json",(error,data)=>{
            if(error) console.log("Error reading data from dist\n"+error);
            else{
                let gameData = JSON.parse(data);
                let accounts = gameData.accounts;
                //Pour cela on verifie si minimum 2 connectés
                //Sinon on affiche le message
                if(accounts.length < 2) client.emit("error-not-enough-players");
                else{
                    //Enfin si c'est le cas alors lancement du jeu
                    if(!gameData.inGame){
                        gameData.chat = [];
                        gameData.inGame = true;
                        startGame(accounts);
                        fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                            if(error) console.log("Error reading data from dist\n"+error);
                        });
                    }
                }
            }
        });
    });
    client.on("new-message",(message)=>{    //Permet de gérer l'envoi de message dans le chat
        fs.readFile("./data.json",(error,data)=>{
            if(error) console.log("Error reading data from dist\n"+error);
            else{
                //Comme d'habitude on recuperer les données du data.json
                let gameData = JSON.parse(data);
                //On rajoute le message à l'arraylist de chat
                gameData.chat.push(message);
                //On save le game data dans le data.json
                fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                    if(error) console.log("Error reading data from dist\n"+error);
                });
                //Update du chat avec l'emit
                io.emit("new-message",message);
            }
        });
    });
    client.on("play-move",()=>{ //Quand tour de jeu
        fs.readFile("./data.json",(error,data)=>{
            if(error) console.log("Error reading data from dist\n"+error);
            else{
                //On recupere le game data du data.json
                let gameData = JSON.parse(data);
                let accounts = gameData.accounts;
                for(let i = 0; i < accounts.length; i++){   //On boucle for sur tout les joueurs
                    if(accounts[i].shown.length > 0){   //si l’utilisateur a des cartes affichées, alors ce mouvement est le mouvement de la bataille, nous devons donc tirer deux cartes
                        if(accounts[i].deck.length > 1){    //s’il y a à 2 cartes, nous tirons deux cartes du jeu et les plaçons dans l'array indiquée
                            accounts[i].shown.push(accounts[i].deck.shift());
                            accounts[i].shown.push(accounts[i].deck.shift());
                        }
                    }
                    else{   //s’il n’y a pas de cartes montrées, il s’agit d’un mouvement régulier et nous tirons une carte
                        if(accounts[i].deck.length > 0) accounts[i].shown.push(accounts[i].deck.shift());
                    }
                }
                //après cela, s’il y a une carte dans l'array affichée, l'event ajouter une carte affichée
                if(accounts[0].shown.length === 1) io.emit("add-shown-card",accounts);
                else io.emit("add-war-cards",accounts); //Sinon ajout carte de l'event la bataille
                //On re save le data dans data.json
                fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                    if(error) console.log("Error reading data from dist\n"+error);
                });
                //Timeout de 3 secondes, nous vérifions qui a la carte la plus élevée et s’il y a une bataille
                setTimeout(()=>{
                    //Création d'une array où il y aura les dernieres cartes affichées
                    let allCards = [];
                    for(let i = 0; i < accounts.length; i++){
                        //Boucle for sur tout les joueurs et plaçons leur dernière carte affichée dans le allCards
                        if(accounts[i].shown.length > 0){
                            let lastCard = accounts[i].shown[accounts[i].shown.length-1];
                            lastCard.index = i;
                            allCards.push(lastCard);
                        }
                    }
                    //Rangement décroissant de l'arraylist
                    allCards.sort((a, b)=>{return b.value - a.value});
                    //si la plus grande valeur est supérieure à la valeur suivante, alors nous avons une carte plus élevée/forte
                    if(allCards[0].value > allCards[1].value){
                        let length = accounts[allCards[0].index].shown.length;  //nous obtenons le nombre de cartes qui ont été montrées par chaque joueur
                        for(let j = 0; j < length; j++){    //ensuite, nous bouclons for ce nombre de fois
                            for(let i = 0; i < accounts.length; i++){   //puis nous bouclons for tous les joueurs
                                //et puis nous envoyons toutes les cartes au deck du joueur qui a la valeur la plus élevée/forte
                                accounts[allCards[0].index].deck.push(accounts[i].shown.pop());
                            }
                        }
                        //nous envoyons the show card result aux joueurs et on re save les nouvelles données dans data.json
                        io.emit("shown-card-result",accounts);
                        fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                            if(error) console.log("Error reading data from dist\n"+error);
                        });
                        //nous vérifions combien de joueurs ont plus de 0 cartes
                        let alivePlayers = 0;
                        for(let i = 0; i < accounts.length; i++){
                            if(accounts[i].deck.length != 0) alivePlayers++;
                        }
                        //s’il n’y a qu’un seul joueur avec plus de 0 carte, nous mettons fin à la partie
                        if(alivePlayers === 1) io.emit("game-over",accounts);
                    }   //s’il y a plusieurs cartes avec la même valeur, nous appelons l’event de la bataille
                    else{io.emit("war",accounts)}
                },3000);
            }
        });
    });
});

//une fonction qui renvoie un entier entre la valeur min compris et la valeur max compris
function random(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
}
function startGame(accounts){
    //maintenant, nous commençons le jeu en mélangeant le deck
    let index = 0, deck = shuffleDeck();
    //ensuite, nous passons en boucle un nombre de fois égal au nombre de cartes que chaque joueur doit recevoir
    //le nombre de cartes que chaque joueur reçoit est 52/nombre de joueurs
    for(let i = 0; i < Math.floor(deck.length/accounts.length)*accounts.length; i++){
        //nous ajoutons la carte au client puis augmentons l’index du joueur
        //de cette façon, nous donnons une carte à chaque joueur, puis répétons ce processus jusqu’à ce que toutes les cartes soient distribuées.
        accounts[index].deck.push(deck[i]);
        index++;
        if(index >= accounts.length) index = 0;
    }
    //nous envoyons l’event du lancement de game à tous les joueurs
    io.emit("start-game",accounts);
}
function shuffleDeck(){
    //Le deck contient 4 type : coeur, carreau, pique, trefle de 13 cartes chacun
    //Avec 2-10 puis ace,roi,reine,valet car 1 = ace et ace dans les régles = plus grosse valeur
    let deck = [], startDeck = [];
    //Boucle for de 0 à 3 pour les 4 types
    for(let i = 0; i < 4; i++){
        //Puis boucle for de 2-14 pour toutes les valeurs (roi = 13 etc etc)
        for(let j = 2; j < 15; j++){
            //Changement de la valeur de ace en 15 pour avoir la plus grosse valeur
            let newValue = j;
            if(newValue === 11) newValue = 15;
            startDeck.push({type:i,value:newValue});
        }
    }
    //maintenant nous avons un jeu de 52 cartes non mélangé
    //nous devons donc mélanger les cartes
    //nous commençons une boucle qui passe par toutes les cartes
    for(let i = 0; i < 52; i++){
        //nous obtenons un nombre aléatoire entre 0 et 51 numéros de cartes déjà triées
        //c’est le nombre qui représente l’entier si un nombre aléatoire du premier deck
        let index = random(0,(51-i));
        //on push ensuite ce nombre sur le deck mélangé
        deck.push(startDeck[index]);
        startDeck.splice(index,1);
    }
    //on return le deck mélangé
    return deck;
}
