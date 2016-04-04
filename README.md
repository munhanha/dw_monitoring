# dw_monitoring
Monitoring system (API) in nodeJS over HTTP

The monitoring system is comprised of three parts:

..::The agent:..

- Responsible for receiving all information in JSON format

- Status page in host:7001/status

- launches multiple process forming a cluster, if any process dies it starts a new one

..::The api::..

- Exposes the database information as a series of API HTTP requests

- status page in host:8001/status

- launches multiple process forming a cluster, if any process dies it starts a new one

..::The database::..

- A Postgres database with a single column named "metrics" that contains all the information

