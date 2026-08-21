window.FC=window.FC||{};
FC.client=supabase.createClient('https://nambmvqtpktwhwcethbi.supabase.co','sb_publishable_YNmyLuQv9f8Kk5v5GVNPdA_Cyd_1432');
FC.$=id=>document.getElementById(id);
FC.state={user:null,coins:0,bankBalance:0,creditScore:500};
FC.message=t=>FC.$('message').textContent=t;
FC.setCoins=v=>{FC.state.coins=Math.max(0,Math.floor(Number(v)||0));FC.$('coins').textContent=FC.state.coins.toLocaleString()};
FC.setBank=v=>{FC.state.bankBalance=Math.max(0,Math.floor(Number(v)||0));FC.$('bankBalance').textContent=FC.state.bankBalance.toLocaleString()+' コイン'};
FC.saveCoins=async v=>{if(!FC.state.user)return false;v=Math.max(0,Math.floor(v));const{data,error}=await FC.client.from('profiles').update({coins:v}).eq('id',FC.state.user.id).select('coins').single();if(error){console.error(error);FC.message('コインの保存に失敗しました');return false}FC.setCoins(data.coins);return true};
FC.changeCoins=async v=>{const n=FC.state.coins+Math.floor(v);if(n<0){FC.message('コインが足りません');return false}return FC.saveCoins(n)};
