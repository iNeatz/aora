import {
	Account,
	Avatars,
	Client,
	Databases,
	ID,
	Query,
	Storage,
} from 'react-native-appwrite'

export const config = {
	endpoint: 'https://cloud.appwrite.io/v1',
	projectId: '66261e0926aadad0fc7d',
	platform: 'com.ineatz.aora',
	databaseId: '66261faa98c51a0a440d',
	userCollectionId: '66261fc49ab90101e314',
	videoCollectionId: '66261fdf3670d0c59d44',
	bookmarkCollectionId: '662bf86c001009e41ebb',
	storageId: '66262111510ded05499f',
}

const client = new Client()

client
	.setEndpoint(config.endpoint)
	.setProject(config.projectId)
	.setPlatform(config.platform)

const account = new Account(client)
const databases = new Databases(client)
const avatars = new Avatars(client)
const storage = new Storage(client)

//REGISTER USER
export const createUser = async (email, password, username) => {
	try {
		const newAccount = await account.create(
			ID.unique(),
			email,
			password,
			username
		)

		if (!newAccount) throw Error

		const avatarUrl = avatars.getInitials(username)

		await signIn(email, password)

		const newUser = await databases.createDocument(
			config.databaseId,
			config.userCollectionId,
			ID.unique(),
			{
				accountId: newAccount.$id,
				email,
				username,
				avatar: avatarUrl,
			}
		)

		return newUser
	} catch (error) {
		console.log('[registerUser]', error)
		throw new Error(error)
	}
}

//SIGN IN USER
export const signIn = async (email, password) => {
	try {
		const session = await account.createEmailSession(email, password)

		return session
	} catch (error) {
		console.log('[signinUser]', error)
		throw new Error(error)
	}
}

export const getCurrentUser = async () => {
	try {
		const currentAccount = await account.get()

		if (!currentAccount) throw Error

		const currentUser = await databases.listDocuments(
			config.databaseId,
			config.userCollectionId,
			[Query.equal('accountId', currentAccount.$id)]
		)

		if (!currentUser) throw Error

		return currentUser.documents[0]
	} catch (error) {
		console.log('[getUser]', error)
		throw new Error(error)
	}
}

export const getAllPosts = async () => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.orderDesc('$createdAt')]
		)

		return posts.documents
	} catch (error) {
		throw new Error(error)
	}
}

export const getLatestPosts = async () => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.orderDesc('$createdAt'), Query.limit(7)]
		)

		return posts.documents
	} catch (error) {
		throw new Error(error)
	}
}

export const searchPosts = async (query) => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.search('title', query)]
		)

		return posts.documents
	} catch (error) {
		throw new Error(error)
	}
}

export const getUserPosts = async (userId) => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.equal('users', userId), Query.orderDesc('$createdAt')]
		)

		return posts.documents
	} catch (error) {
		throw new Error(error)
	}
}

export const signOut = async () => {
	try {
		const session = await account.deleteSession('current')

		return session
	} catch (error) {
		throw new Error(error)
	}
}

export const getFilePreview = async (fileId, type) => {
	let fileUrl

	try {
		if (type === 'video') {
			fileUrl = storage.getFileView(config.storageId, fileId)
		} else if (type === 'image') {
			fileUrl = storage.getFilePreview(
				config.storageId,
				fileId,
				2000,
				2000,
				'top',
				100
			)
		} else {
			throw new Error('Invalid file type')
		}

		if (!fileUrl) throw Error

		return fileUrl
	} catch (error) {
		throw new Error(error)
	}
}

export const uploadFile = async (file, type) => {
	if (!file) return

	const asset = {
		name: file.fileName,
		type: file.mimeType,
		size: file.filesize,
		uri: file.uri,
	}

	try {
		const uploadedFile = await storage.createFile(
			config.storageId,
			ID.unique(),
			asset
		)

		const fileUrl = await getFilePreview(uploadedFile.$id, type)

		return fileUrl
	} catch (error) {
		throw new Error(error)
	}
}

export const createVideo = async (form) => {
	try {
		const [thumbnailUrl, videoUrl] = await Promise.all([
			uploadFile(form.thumbnail, 'image'),
			uploadFile(form.video, 'video'),
		])

		const newPost = await databases.createDocument(
			config.databaseId,
			config.videoCollectionId,
			ID.unique(),
			{
				title: form.title,
				thumbnail: thumbnailUrl,
				video: videoUrl,
				prompt: form.prompt,
				users: form.userId,
			}
		)

		return newPost
	} catch (error) {
		throw new Error(error)
	}
}
