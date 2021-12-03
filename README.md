### 给特定的某个commit版本打标签，比如现在某次提交的id为 039bf8b
- git tag v1.0.0 039bf8b
- git tag v1.0.0 -m "add tags information" 039bf8b
- git tag v1.0.0 039bf8b -m "add tags information"
### 删除本地某个标签
- git tag --delete v1.0.0
- git tag -d v1.0.0
- git tag --d v1.0.0

### 删除远程的某个标签
- git push -d origin v1.0.0
- git push --delete origin v1.0.0
- git push origin -d v1.0.0
- git push origin --delete v1.0.0
- git push origin :v1.0.0
### 将本地标签一次性推送到远程
- git push --tag