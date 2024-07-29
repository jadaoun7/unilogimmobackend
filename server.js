const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// In-memory cache
const cache = new Map();

const dbConfig = {
  'CLT': {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'CLT',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  'BIJOU': {
    user: 'sa',
    password: 'P@ssw0rd',
    server: 'SAGE100CV4\\SAGE100CV4_2016',
    database: 'BIJOU',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  'LIB': {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'LIB',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  'CYP': {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'CYP',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  'CSB': {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'CSB',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};

app.get('/api/immobilisation/:db_name/:im_code', async (req, res) => {
  const { db_name, im_code } = req.params;
  const config = dbConfig[db_name];

  if (!config) {
    return res.status(400).send('Invalid database name.');
  }

  // Use a composite cache key to differentiate between databases
  const cacheKey = `${db_name}:${im_code}`;

  try {
    // Check cache first
    if (cache.has(cacheKey)) {
      const cachedData = JSON.parse(cache.get(cacheKey));
      return res.json(cachedData);
    }

    let pool = await sql.connect(config);
    let result = await pool.request()
      .input('im_code', sql.VarChar, im_code)
      .query(`
        SELECT 
    fi.IM_Code,
    MAX(fi.IM_Intitule) AS IM_Intitule,
    MAX(fi.IM_Complement) AS IM_Complement,
    MAX(fi.FA_CodeFamille) AS FA_CodeFamille,
    MAX(ff.fa_intitule) AS FA_Intitule,
	MAX(CONVERT(VARCHAR(10),fi.IM_DateAcq,111)) AS IM_DateAcq,
	MAX(CONVERT(VARCHAR(10),fi.IM_DateServ,111)) AS IM_DateServ,
	MAX(fi.IM_NbAnnee01) AS IM_NbAnnee01,
	MAX(fi.IM_NbMois01) AS IM_NbMois01,
    MAX(fi.IM_Quantite) AS IM_Quantite,
    MAX(fs.IM_NoSerie) AS IM_NoSerie
FROM 
    F_IMMOBILISATION fi
LEFT JOIN 
    F_IMMOSERIE fs 
ON 
    fi.IM_Code = fs.IM_Code
LEFT JOIN 
    F_FAMILLEIMMO ff
ON 
    fi.FA_CodeFamille = ff.FA_CodeFamille
WHERE 
    fi.IM_Code = @im_code
GROUP BY 
    fi.IM_Code
      `);

    // Cache the result
    const responseData = { db_name, ...result.recordset[0] };
    cache.set(cacheKey, JSON.stringify(responseData));

    res.json(responseData);
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    sql.close();
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
