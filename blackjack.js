/* FREE CASINO // BLACKJACK ENGINE
 * Optional standalone engine for the existing blackjack UI.
 * Rules: dealer stands on 17, blackjack pays 3:2, double is allowed only
 * on the first two player cards, and Aces are valued as 1 or 11.
 */
(function(){
  "use strict";

  const SUITS = ["♠","♥","♦","♣"];
  const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

  function shuffle(deck){
    for(let i=deck.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
  }

  function createDeck(){
    const deck=[];
    for(const suit of SUITS){
      for(const rank of RANKS){ deck.push({rank,suit}); }
    }
    return shuffle(deck);
  }

  function handValue(hand){
    let total=0, aces=0;
    for(const card of hand){
      if(card.rank === "A"){ total += 11; aces++; }
      else if(["K","Q","J"].includes(card.rank)) total += 10;
      else total += Number(card.rank);
    }
    while(total>21 && aces>0){ total-=10; aces--; }
    return total;
  }

  function isBlackjack(hand){ return hand.length===2 && handValue(hand)===21; }

  function createGame(bet){
    const deck=createDeck();
    return {
      deck,
      player:[deck.pop(),deck.pop()],
      dealer:[deck.pop(),deck.pop()],
      bet,
      active:true,
      doubled:false
    };
  }

  function hit(game){
    if(!game || !game.active) return {ok:false,reason:"inactive"};
    game.player.push(game.deck.pop());
    const value=handValue(game.player);
    if(value>21){ game.active=false; return {ok:true,status:"bust",value}; }
    if(value===21) return {ok:true,status:"21",value};
    return {ok:true,status:"continue",value};
  }

  function double(game){
    if(!game || !game.active) return {ok:false,reason:"inactive"};
    if(game.player.length!==2) return {ok:false,reason:"double_only_on_initial_two_cards"};
    game.bet*=2;
    game.doubled=true;
    const result=hit(game);
    if(result.status!=="bust") stand(game);
    return result;
  }

  function stand(game){
    if(!game || !game.active) return {ok:false,reason:"inactive"};
    while(handValue(game.dealer)<17) game.dealer.push(game.deck.pop());
    game.active=false;
    const p=handValue(game.player), d=handValue(game.dealer);
    if(d>21 || p>d) return {ok:true,result:"win",p,d};
    if(p===d) return {ok:true,result:"push",p,d};
    return {ok:true,result:"lose",p,d};
  }

  function settle(game){
    if(!game || game.active) return null;
    const playerBJ=isBlackjack(game.player), dealerBJ=isBlackjack(game.dealer);
    if(playerBJ && dealerBJ) return {result:"push",payout:game.bet};
    if(playerBJ) return {result:"blackjack",payout:Math.floor(game.bet*2.5)};
    if(dealerBJ) return {result:"lose",payout:0};
    const p=handValue(game.player), d=handValue(game.dealer);
    if(p>21) return {result:"lose",payout:0};
    if(d>21 || p>d) return {result:"win",payout:game.bet*2};
    if(p===d) return {result:"push",payout:game.bet};
    return {result:"lose",payout:0};
  }

  window.FreeCasinoBlackjack = {createDeck,handValue,isBlackjack,createGame,hit,double,stand,settle};
})();
