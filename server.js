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
                    //we send and event to all the player to cancel the current game
                    io.emit("player-disconnect");
                    //and we reset the game data back to the default value
                    gameData = {inGame:false,accounts:[],chat:[]};
                    //we save the data back ot the data.json
                    fs.writeFile("./data.json",JSON.stringify(gameData),(error)=>{
                        if(error) console.log("Error reading data from dist\n"+error);
                    });
                }
                //if the game hasn't started we simply loop through all the players and find the one Si la game n'a pas commencer alors on lance boucle for
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
