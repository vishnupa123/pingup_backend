import dns from 'dns';
import mongoose from 'mongoose';

const uri = 'mongodb+srv://vishnullap_db_user:sJWPtez0CAUSQkKk@cluster0.g1rnjkg.mongodb.net/?retryWrites=true&w=majority';

console.log('DNS servers:', dns.getServers());

try {
  const res = await dns.promises.resolveSrv('cluster0.g1rnjkg.mongodb.net');
  console.log('SRV records:', JSON.stringify(res));
} catch (e) {
  console.error('SRV lookup failed:', e);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 });
  console.log('Connected successfully');
} catch (error) {
  console.error('Connection failed:', error);
} finally {
  await mongoose.disconnect().catch(() => {});
}
