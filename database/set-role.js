// Owner-run provisioning: first register normally with your own private password,
// then run this in the host's shell. Never put passwords in commands or Git.
import mongoose from 'mongoose';
import {User,connectDb} from './db.js';
const [username,role]=process.argv.slice(2);
if(!/^[a-z0-9_]{4,20}$/.test(username||'')||!['staff','admin','customer'].includes(role)){
 console.error('Usage: node database/set-role.js USERNAME staff|admin|customer');process.exit(1);
}
try{await connectDb();const user=await User.findOne({username});if(!user)throw Error('Register this username in the public app first.');user.role=role;await user.save();console.log('Updated role for '+username+' to '+role+'. Sign out and sign back in.');}finally{await mongoose.disconnect();}
